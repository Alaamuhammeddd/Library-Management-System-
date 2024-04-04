const router = require("express").Router();
const conn = require("../dB/dbConnection");
const { body, validationResult } = require("express-validator");
const util = require("util"); // helper
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });
const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts from this IP, please try again later",
});
router.post(
  "/login",
  loginLimiter,
  body("Email").isEmail().withMessage("please enter a valid email!"),
  body("Password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) characters"),
  async (req, res) => {
    try {
      console.log("Login endpoint called.");

      // 1- VALIDATION REQUEST [manual, express validation]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF EMAIL EXISTS
      const query = util.promisify(conn.query).bind(conn);
      const user = await query("SELECT * FROM users WHERE Email = ?", [
        req.body.Email,
      ]);
      console.log("User data:", user);

      if (user.length === 0) {
        console.log("Email not found.");
        return res.status(404).json({
          errors: [{ msg: "Email or Password not found!" }],
        });
      }

      // 3- COMPARE HASHED PASSWORD
      const checkPassword = await bcrypt.compare(
        req.body.Password,
        user[0].Password
      );
      console.log("Check Password:", checkPassword);

      if (checkPassword) {
        delete user[0].Password;
        return res.status(200).json(user[0]);
      } else {
        console.log("Entered password:", req.body.Password);
        console.log("Stored hashed password:", user[0].Password);
        return res.status(404).json({
          errors: [{ msg: "Email or Password not found!" }],
        });
      }
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).json({ err: err.message });
    }
  }
);

// ========================================END OF LOG IN ====================================

router.post(
  "/registeration",
  body("Email").isEmail().withMessage("please enter a valid email!"),
  body("User_name")
    .isString()
    .withMessage("please enter a valid name")
    .isLength({ min: 10, max: 25 })
    .withMessage("name should be between (10-20) character"),
  body("Password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) character"),
  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST [manual, express validation]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF EMAIL EXISTS
      const query = util.promisify(conn.query).bind(conn); // transform query mysql --> promise to use [await/async]
      const checkEmailExists = await query(
        "select * from users where Email = ?",
        [req.body.Email]
      );
      if (checkEmailExists.length > 0) {
        return res.status(400).json({
          errors: [
            {
              msg: "email already exists !",
            },
          ],
        });
      }

      // 3- PREPARE OBJECT USER TO -> SAVE
      const userData = {
        User_name: req.body.User_name,
        Email: req.body.Email,
        Password: await bcrypt.hash(req.body.Password, 10), // Using bcrypt.hash() for hashing
        Token: crypto.randomBytes(16).toString("hex"),
      };
      // Truncate the hashed password if it exceeds the length
      // 4- INSERT USER OBJECT INTO DB
      await query("insert into users set ? ", userData);
      delete userData.Password;
      res.status(200).json(userData);
    } catch (err) {
      res.status(500).json({ err: err });
    }
  }
);

module.exports = router;
