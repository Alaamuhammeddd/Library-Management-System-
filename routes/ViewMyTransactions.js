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
router.get("/", authorized, async (req, res) => {
  try {
    const userId = res.locals.user.id_Users;

    const query = `
        SELECT
          B.Book_Image,
          B.Title AS Book_title,
          T.Type,
          T.TimeStamp,
          CASE
            WHEN T.Type = 'Borrow' THEN DATEDIFF(T.dataDue, CURDATE())
            ELSE T.dataReturn
          END AS ReturnDateOrRemainingDays
        FROM Transactions T
        INNER JOIN Books B ON T.ISBN_Book = B.ISBN_Books
        WHERE T.id_Users = ?
        ORDER BY T.id_Transactions DESC;
      `;

    conn.query(query, [userId], (error, results) => {
      if (error) {
        console.error("Error fetching user transactions:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json(results);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
