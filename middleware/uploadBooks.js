const multer = require("multer");
const path = require("path");
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "Images/");
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "Book_Image" || file.fieldname === "Book_File") {
      cb(null, true);
    } else {
      cb(new Error("Invalid fieldname for file upload"));
    }
  },
});
module.exports = upload;
