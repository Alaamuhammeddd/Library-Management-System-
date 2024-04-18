const express = require("express");
const router = express.Router();
const conn = require("../dB/dbConnection");

// VIEW TRANSACTION HISTORY

// router.get("/transactions", async (req, res) => {
//   const query = `
//     SELECT
//       T.id_Transactions,
//       U.User_name,
//       B.Book_Image,
//       B.Title AS Book_title,
//       T.Type,
//       T.TimeStamp,
//       CASE
//         WHEN T.Type = 'Borrow' THEN DATEDIFF(T.dataDue, CURDATE())
//         ELSE DATEDIFF(T.dataReturn, T.dataDue)
//       END AS remainingDays
//     FROM Transactions T
//     INNER JOIN Users U ON T.id_Users = U.id_Users
//     INNER JOIN Books B ON T.ISBN_Book = B.ISBN_Books
//     ORDER BY T.id_Transactions DESC;
//   `;

//   conn.query(query, (error, results) => {
//     if (error) {
//       console.error("Error fetching transactions:", error);
//       return res.status(500).json({ message: "Internal server error" });
//     }
//     res.json(results);
//   });
// });
router.get("/transactions", async (req, res) => {
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

module.exports = router;
