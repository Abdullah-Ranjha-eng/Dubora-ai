import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, "Please enter your name."], maxLength: 100 },
  email:    { type: String, required: [true, "Please enter your email."], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, "Please enter your password."], minLength: 6, select: false },
}, { timestamps: true });

// Hash password before saving.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME || "7d",
  });
};

export default mongoose.model("User", userSchema);
