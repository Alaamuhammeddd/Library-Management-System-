const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1AlaaloloM!!",
  database: "lib_ns",
  port: "3306",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("DB CONNECTED");
});

module.exports = connection;
