const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // TO ACCESS URL FORM ENCODED
app.use(express.static("uploads"));
const cors = require("cors");
app.use(cors());

const auth = require("./routes/Auth");
const books = require("./routes/Books");
const review = require("./routes/Review");
const admin = require("./routes/Admin");

app.listen(4000, "localhost", () => {
  console.log("SERVER IS RUNNING");
});
app.use("/auth", auth);
app.use("/books", books);
app.use("/review", review);
app.use("/admin", admin);
