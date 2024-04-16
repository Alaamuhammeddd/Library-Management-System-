const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const db = require("../dB/dbConnection");
const authorized = require("../middleware/authorize");
router.post(
  "/:ISBN_Book",
  authorized,
  [
    body("Rating").isInt({ min: 1, max: 5 }),
    body("Comment").optional().isLength({ max: 255 }),
  ],
  (req, res) => {
    // Extract ISBN_Book from URL params
    const { ISBN_Book } = req.params;
    const userId = res.locals.user.id_Users;

    // Proceed with input validation from the body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract the rest of the review details from the request body
    const { Rating, Comment } = req.body;
    const reviewId = Math.floor(10000 + Math.random() * 90000);

    // SQL to insert review into the database, using ISBN_Book from URL params
    const sql =
      "INSERT INTO reviews (id_Reviews, ISBN_Book, id_User, Rating, Comment) VALUES (?, ?, ?, ?, ?)";

    // Execute SQL query to insert review
    db.query(
      sql,
      [reviewId, ISBN_Book, userId, Rating, Comment],
      (err, result) => {
        if (err) {
          console.error("Error executing query:", err);
          res.status(500).json({ message: "Internal server error" });
          return;
        }

        res.json({ message: "Review added successfully." });
      }
    );
  }
);

router.get("/:ISBN_Book", (req, res) => {
  const { ISBN_Book } = req.params;

  // SQL query to select reviews
  const sql = "SELECT * FROM lib_ns.Reviews WHERE ISBN_Book = ?";

  // Execute the SQL query
  db.query(sql, [ISBN_Book], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    // Check if reviews were found
    if (results.length === 0) {
      res.status(404).json({ message: "No reviews found for this book." });
    } else {
      res.json(results);
    }
  });
});

module.exports = router;
