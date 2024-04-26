const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const conn = require("../dB/dbConnection");
require('dotenv').config();
const util = require('util');


const queryAsync = util.promisify(conn.query).bind(conn);


async function ensureTokenExpiryColumnExists() {
    try {
        const checkColumnExistsQuery = `
            SELECT EXISTS (
                SELECT 1
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE table_schema = (SELECT DATABASE())
                AND table_name = 'users'
                AND column_name = 'TokenExpiry'
            ) AS 'exists';
        `;

        const results = await queryAsync(checkColumnExistsQuery);
        const columnExists = results[0]['exists'] === 1;

        if (!columnExists) {
            const addColumnQuery = `ALTER TABLE users ADD COLUMN TokenExpiry DATETIME NULL;`;
            await queryAsync(addColumnQuery);
        }
    } catch (error) {
        console.error("An error occurred while ensuring the TokenExpiry column exists:", error);
    }
}

ensureTokenExpiryColumnExists();

router.post('/', async (req, res) => {
    const { Email } = req.body;

    if (!Email) {
        return res.status(400).send('An email is required');
    }

    try {
        const [users] = await queryAsync('SELECT * FROM users WHERE Email = ?', [Email]);
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = jwt.sign({ Email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await queryAsync('UPDATE users SET Token = ?, TokenExpiry = ? WHERE Email = ?', [token, expiryDate, Email]);

        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: Email,
            subject: 'Password Reset',
            html: ` <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; color: #333;">
            <h2>Password Reset Request</h2>
            <p>To reset your password, please click on the link below:</p>
            <a href="http://localhost:4000/forget-password/reset-password?token=${token}" style="color: #0066cc;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            </div>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Failed to send email' });
            }
            res.status(200).json({ message: 'Email sent successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred during the operation' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {

        const [users] = await queryAsync('SELECT * FROM users WHERE Token = ? AND TokenExpiry > NOW()', [token]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {

                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await queryAsync('UPDATE users SET Password = ?, Token = NULL, TokenExpiry = NULL WHERE Email = ?', [hashedPassword, decoded.Email]);

            res.status(200).json({ message: 'Password updated successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while updating the password' });
    }
});

module.exports = router;
