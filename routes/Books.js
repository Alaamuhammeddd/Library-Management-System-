const express = require("express");
const router = express.Router();
const multer = require("multer");
const util = require("util");
const { body, validationResult } = require("express-validator");
const conn = require("../dB/dbConnection");
const fs = require("fs");
const upload = require("../middleware/uploadBooks");
const admin = require("../middleware/admin");
const authorized = require("../middleware/authorize");
// SHOW SPECIFIC BOOK
router.get("/:ISBN_Books", admin, async (req, res) => {
  try {
    const ISBN_Books = req.params.ISBN_Books; // Add this line to check

    // Query to fetch the book from the database by ISBN
    const query = "SELECT * FROM books WHERE ISBN_Books = ?";
    const book = await util.promisify(conn.query).bind(conn)(query, [
      ISBN_Books,
    ]);

    // Check if the book was found
    if (book.length > 0) {
      return res.status(200).json({ book });
    } else {
      return res.status(404).json({ error: "Book not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// SEARCH
router.get("/", authorized, async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    let search = "";

    if (req.query.search) {
      // Constructing the search query based on name or description
      search = `WHERE Title LIKE '%${req.query.search}%' OR Author LIKE '%${req.query.search}%' OR Genre LIKE '%${req.query.search}%'`;
    }

    const book = await query(`SELECT * FROM books ${search}`);

    return res.status(200).json(book);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
//GET ALL BOOKS
router.get("/", async (req, res) => {
  try {
    // Query to fetch all books from the database
    const query = "SELECT * FROM books";
    const books = await util.promisify(conn.query).bind(conn)(query);

    // Check if books were found
    if (books.length > 0) {
      return res.status(200).json({ books });
    } else {
      return res.status(404).json({ error: "No books found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ADD BOOK
router.post(
  "",
  admin,
  upload.fields([
    { name: "Book_Image", maxCount: 1 },
    { name: "Book_File", maxCount: 1 },
  ]),
  body("Title")
    .isString()
    .withMessage("Please enter a valid book title")
    .isLength({ min: 10 })
    .withMessage("Book title should be at least 10 characters"),

  body("Description")
    .isString()
    .withMessage("Please enter a valid description ")
    .withMessage("Description should be at least 20 characters"),

  body("ISBN_Books").custom((value) => {
    const isbnInteger = parseInt(value, 10);
    if (isNaN(isbnInteger)) {
      throw new Error("Please enter a valid ISBN");
    }
    console.log(isbnInteger);
    return true;
  }),

  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST [manual, express validation]
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- VALIDATE THE IMAGE
      if (!req.files || !req.files["Book_Image"] || !req.files["Book_File"]) {
        return res.status(400).json({
          errors: [
            {
              msg: "Both book image and book file are required",
            },
          ],
        });
      }

      // 4 - INSERT BOOK INTO DB
      const query =
        "INSERT INTO Books (ISBN_Books, Title, Book_Image, Book_File, Author, Genre, Description, `Availability status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const values = [
        req.body.ISBN_Books,
        req.body.Title,
        req.files["Book_Image"][0].filename,
        req.files["Book_File"][0].filename,
        req.body.Author,
        req.body.Genre,
        req.body.Description,
        "Yes", // Assuming new books are available by default
      ];

      bookImage = req.files["Book_Image"][0].filename;
      bookFile = req.files["Book_File"][0].filename;
      // Assuming you have a function to establish a database connection
      const result = await util.promisify(conn.query).bind(conn)(query, values);

      if (result.affectedRows > 0) {
        // If the book insertion is successful, assign the uploaded files to variables

        res.status(201).json({ message: "Book Added Successfully" });
      } else {
        res.status(500).json({ error: "Error Adding Book" });
      }
    } catch (err) {
      console.error(err);
      // If an error occurs, delete the uploaded files (if any) and send an error response
      if (bookImage) {
        // Delete the book image file if it was uploaded
        fs.unlinkSync(`Images/${bookImage}`);
      }
      if (bookFile) {
        // Delete the book file if it was uploaded
        fs.unlinkSync(`Images/${bookFile}`);
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// DElETE BOOK
router.delete("/:ISBN_Books", admin, async (req, res) => {
  try {
    const ISBN_Books = req.params.ISBN_Books;

    // Check if the ISBN is provided
    if (!ISBN_Books) {
      return res.status(400).json({ error: "ISBN is required" });
    }

    // Query to fetch the book's file names from the database
    const fetchQuery =
      "SELECT Book_Image, Book_File FROM Books WHERE ISBN_Books = ?";
    const [book] = await util.promisify(conn.query).bind(conn)(fetchQuery, [
      ISBN_Books,
    ]);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Deleting the book from the database
    const deleteQuery = "DELETE FROM Books WHERE ISBN_Books = ?";
    const deleteResult = await util.promisify(conn.query).bind(conn)(
      deleteQuery,
      [ISBN_Books]
    );

    // Check if the book was successfully deleted from the database
    if (deleteResult.affectedRows > 0) {
      // Unlinking the book files from the file system
      if (book.Book_Image) {
        fs.unlinkSync(`Images/${book.Book_Image}`);
      }
      if (book.Book_File) {
        fs.unlinkSync(`Images/${book.Book_File}`);
      }

      return res.status(200).json({ message: "Book deleted successfully" });
    } else {
      return res.status(404).json({ error: "Book not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE BOOK
router.put(
  "/:ISBN_Books",
  admin,
  upload.fields([
    { name: "Book_Image", maxCount: 1 },
    { name: "Book_File", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const ISBN_Books = req.params.ISBN_Books;
      const { Title, Description, Author, Genre } = req.body;

      // Check if the ISBN is provided
      if (!ISBN_Books) {
        return res.status(400).json({ error: "ISBN is required" });
      }

      // Query to fetch the existing book from the database
      const fetchQuery = "SELECT * FROM books WHERE ISBN_Books = ?";
      const [existingBook] = await util.promisify(conn.query).bind(conn)(
        fetchQuery,
        [ISBN_Books]
      );

      if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Update book information if provided
      if (Title) existingBook.Title = Title;
      if (Description) existingBook.Description = Description;
      if (Author) existingBook.Author = Author;
      if (Genre) existingBook.Genre = Genre;

      // Check if files were uploaded
      if (req.files) {
        if (req.files["Book_Image"]) {
          // Delete old image if exists
          if (existingBook.Book_Image) {
            fs.unlinkSync(`Images/${existingBook.Book_Image}`);
          }
          existingBook.Book_Image = req.files["Book_Image"][0].filename;
        }
        if (req.files["Book_File"]) {
          // Delete old file if exists
          if (existingBook.Book_File) {
            fs.unlinkSync(`Images/${existingBook.Book_File}`);
          }
          existingBook.Book_File = req.files["Book_File"][0].filename;
        }
      }

      // Query to update the book in the database
      const updateQuery =
        "UPDATE Books SET Title = ?, Description = ?, Author = ?, Genre = ?, Book_Image = ?, Book_File = ? WHERE ISBN_Books = ?";
      const updateResult = await util.promisify(conn.query).bind(conn)(
        updateQuery,
        [
          existingBook.Title,
          existingBook.Description,
          existingBook.Author,
          existingBook.Genre,
          existingBook.Book_Image,
          existingBook.Book_File,
          ISBN_Books,
        ]
      );

      // Check if the book was successfully updated in the database
      if (updateResult.affectedRows > 0) {
        return res.status(200).json({ message: "Book updated successfully" });
      } else {
        return res.status(500).json({ error: "Failed to update book" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// COUNT AVAILABLE BOOKS
router.get("/availability/count", async (req, res) => {
  try {
    const sql =
      "SELECT COUNT(*) AS AvailableBooks FROM books WHERE `Availability status`='Yes'";
    conn.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json(result[0]);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
