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
    // Extract token from request headers

    // Verify and decode the token to get the user's ID
    // const decoded = jwt.verify(authorized.token, process.env.JWT_SECRET);

    const userId = res.locals.user.id_Users;
    // const decodedUserId = decoded.userId;
    const ISBN_Books = req.params.ISBN_Books;

    let returnDate = req.body.returnDate;

    // Check if ISBN_Book is provided
    if (!ISBN_Books) {
      return res.status(400).json({ error: "ISBN is required" });
    }
    if (!returnDate) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + 14); // Adding 14 days to the current date
      returnDate = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    }

    // Check if the book is available
    const availabilityQuery =
      "SELECT `Availability status` FROM books WHERE ISBN_Books = ?";
    const [bookStatus] = await util.promisify(conn.query).bind(conn)(
      availabilityQuery,
      [ISBN_Books]
    );
    if (
      !bookStatus ||
      bookStatus["Availability status"].toUpperCase() !== "YES"
    ) {
      return res
        .status(400)
        .json({ error: "The book is not available for borrowing" });
    }

    const formattedReturnDate =
      returnDate +
      " " +
      new Date().toLocaleTimeString("en-US", { hour12: false });

    const currentDate = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
    });

    const transactionId = Math.floor(10000 + Math.random() * 90000); // Generates a random number between 10000 and 99999

    const formattedCurrentDate = currentDate + " " + currentTime;
    const insertQuery =
      "INSERT INTO transactions (id_Transactions, id_Users, ISBN_Book, Type, dataDue, TimeStamp) VALUES (?, ?, ?, 'Borrow', ?, ?)";
    await util.promisify(conn.query).bind(conn)(insertQuery, [
      transactionId,
      userId,
      ISBN_Books,
      formattedReturnDate,
      formattedCurrentDate,
    ]);

    // Update the status of the book in the Books table to 'no'
    const updateQuery =
      "UPDATE books SET `Availability status` = 'no' WHERE ISBN_Books = ?";
    await util.promisify(conn.query).bind(conn)(updateQuery, [ISBN_Books]);

    return res.status(200).json({ message: "Book borrowed successfully" });
  } catch (err) {
    console.error(err);
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
