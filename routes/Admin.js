const express = require("express");
const router = express.Router();
const conn = require("../dB/dbConnection");

// VIEW TRANSACTION HISTORY
router.get("/transactions", async (req, res) => {
  const query = `
      SELECT
        id_Transactions,
        id_Users,
        ISBN_Book,
        Type,
        dataDue,
        dataReturn
      FROM lib_ns.Transactions
      ORDER BY id_Transactions DESC;`;

  conn.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(results);
  });
});

module.exports = router;
