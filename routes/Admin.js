const express = require("express");
const router = express.Router();
const conn = require("../dB/dbConnection");
const admin = require("../middleware/admin");
const util = require("util");
const authorized = require("../middleware/authorize");
// VIEW ALL TRANSACTIONS
router.get("/transactions", admin, async (req, res) => {
  const query = `
    SELECT
      T.id_Transactions,
      U.User_name,
      B.Book_Image,
      B.Title AS Book_title,
      T.Type,
      T.TimeStamp,
      CASE
        WHEN T.Type = 'Borrow' THEN DATEDIFF(T.dataDue, CURDATE())
        ELSE T.dataReturn
      END AS ReturnDateOrRemainingDays
    FROM Transactions T
    INNER JOIN Users U ON T.id_Users = U.id_Users
    INNER JOIN Books B ON T.ISBN_Book = B.ISBN_Books
    ORDER BY T.id_Transactions DESC;
  `;

  conn.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(results);
  });
});

//DELETE USER
router.delete("/users/:userId", admin, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if the user has associated transactions (books borrowed)
    const checkQuery = "SELECT * FROM transactions WHERE id_Users = ?";
    const transactions = await util.promisify(conn.query).bind(conn)(
      checkQuery,
      [userId]
    );

    // Return all books borrowed by the user
    if (transactions.length > 0) {
      // Construct query to update book status to 'Yes' for books borrowed by the user
      const updateBookStatusQuery = `
        UPDATE books
        SET \`Availability status\` = 'Yes'
        WHERE ISBN_Books IN (SELECT ISBN_Book FROM transactions WHERE id_Users = ?)
      `;
      await util.promisify(conn.query).bind(conn)(updateBookStatusQuery, [
        userId,
      ]);

      // Now delete all transactions of the user
      const deleteTransactionsQuery =
        "DELETE FROM transactions WHERE id_Users = ?";
      await util.promisify(conn.query).bind(conn)(deleteTransactionsQuery, [
        userId,
      ]);
    }

    // Now delete the user
    const deleteQuery = "DELETE FROM users WHERE id_Users = ?";
    const deleteResult = await util.promisify(conn.query).bind(conn)(
      deleteQuery,
      [userId]
    );

    if (deleteResult.affectedRows > 0) {
      return res.status(200).json({ message: "User deleted successfully" });
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//GET USERS
router.get("/users-borrowed-books", admin, async (req, res) => {
  try {
    // Check if the user is an admin

    // Query to fetch all users and count of books they have borrowed
    const query = `
      SELECT
        U.User_name,
        COUNT(T.id_Transactions) AS BooksBorrowed
      FROM Users U
      LEFT JOIN Transactions T ON U.id_Users = T.id_Users AND T.Type = 'Borrow'
      GROUP BY U.User_name
      ORDER BY U.User_name;
    `;

    conn.query(query, (error, results) => {
      if (error) {
        console.error("Error fetching users and borrowed books:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json(results);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE USER
router.put("/users/:userId", authorized, async (req, res) => {
  const { username, email } = req.body;
  const userId = req.params.userId;

  // Input validation
  if (!username && !email) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  // Construct the update query based on provided fields
  let updateFields = [];
  let values = [];
  if (username) {
    updateFields.push("User_name = ?");
    values.push(username);
  }
  if (email) {
    updateFields.push("email = ?");
    values.push(email);
  }

  // Update user in the database
  const updateUserQuery = `UPDATE users SET ${updateFields.join(
    ", "
  )} WHERE id_Users = ?`;
  values.push(userId);

  try {
    await util.promisify(conn.query).bind(conn)(updateUserQuery, values);
    res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user." });
  }
});

module.exports = router;
