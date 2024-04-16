const express = require("express");
const router = express.Router();
const multer = require("multer");
const util = require("util");
const { body, validationResult } = require("express-validator");
const conn = require("../dB/dbConnection");
const fs = require("fs");
const upload = require("../middleware/uploadBooks");
const jwt = require("jsonwebtoken");
const authorized = require("../middleware/authorize");

router.post("/:ISBN_Books", authorized, async (req, res) => {
  try {
    const userId = res.locals.user.id_Users;
    // const decodedUserId = decoded.userId;
    const ISBN_Books = req.params.ISBN_Books;

    const checkQuery =
      "SELECT * FROM books WHERE ISBN_Books = ? AND `Availability status` = 'No'";
    const bookCheck = await util.promisify(conn.query).bind(conn)(checkQuery, [
      ISBN_Books,
    ]);

    if (bookCheck.length === 0) {
      return res
        .status(404)
        .json({ error: "Book not found or not currently borrowed" });
    }
    const checkQueryBorrow =
      "SELECT * FROM transactions WHERE id_Users = ? AND ISBN_Book = ? AND Type = 'Borrow'";
    const borrowHistory = await util.promisify(conn.query).bind(conn)(
      checkQueryBorrow,
      [userId, ISBN_Books]
    );

    if (borrowHistory.length === 0) {
      return res.status(404).json({ error: "You have not borrowed this book" });
    }
    // Update the book's Availability status to 'Yes' to indicate it has been returned
    const updateQuery =
      "UPDATE books SET `Availability status` = 'Yes' WHERE ISBN_Books = ?";
    const updateResult = await util.promisify(conn.query).bind(conn)(
      updateQuery,
      [ISBN_Books]
    );

    const currentDate = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
    });
    const transactionId = Math.floor(10000 + Math.random() * 90000); // Generates a random number between 10000 and 99999

    const formattedCurrentDate = currentDate + " " + currentTime;
    const insertQuery =
      "INSERT INTO transactions (id_Transactions, id_Users, ISBN_Book, Type, dataReturn, TimeStamp) VALUES (?, ?, ?, 'Return', ?, ?)";
    await util.promisify(conn.query).bind(conn)(insertQuery, [
      transactionId,
      userId,
      ISBN_Books,
      formattedCurrentDate,
      formattedCurrentDate,
    ]);

    if (updateResult.affectedRows > 0) {
      return res.status(200).json({ message: "Book returned successfully" });
    } else {
      return res.status(500).json({ error: "Failed to return book" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
