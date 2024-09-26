import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import jwt from "jsonwebtoken";
import { verifyAuth } from "./utils.js";
import { verifyEmail } from "./utils.js";
/**
 * Register a new user in the system
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - error 400 is returned if there is already a user with the same username and/or email
 */
export const register = async (req, res) => {
	try {
		const { username, email, password } = req.body;

		if (!username) return res.status(400).json({ error: "Please provide the username" });
		if (!email) return res.status(400).json({ error: "Please provide the email" });
		if (!password) return res.status(400).json({ error: "Please provide the password" });

		if (!username.trim() || !email.trim() || !password.trim())
			return res.status(400).json({ error: "Please provide all the required fields" });

		const isValidEmail = verifyEmail(email); // Use the verifyEmail function to check the validity of the entered email
		if (!isValidEmail) return res.status(400).json({ error: "Invalid email" });

		const existingUser = await User.findOne({ email: req.body.email.trim() });
		if (existingUser) return res.status(400).json({ error: "You are already registered" });

		const existingUser2 = await User.findOne({ username: req.body.username.trim() });
		if (existingUser2) return res.status(400).json({ error: "You are already registered" });

		const hashedPassword = await bcrypt.hash(password.trim(), 12);
		const newUser = await User.create({
			username: username.trim(),
			email: email.trim(),
			password: hashedPassword,
		});

		res.status(200).json({ data: { message: "User added successfully" } });
	} catch (err) {
		res.status(500).json(err);
	}
};

/**
 * Register a new user in the system with an Admin role
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - error 400 is returned if there is already a user with the same username and/or email
 */
export const registerAdmin = async (req, res) => {
	try {
		const { username, email, password } = req.body;

		if (!username) return res.status(400).json({ error: "Please provide the username" });
		if (!email) return res.status(400).json({ error: "Please provide the email" });
		if (!password) return res.status(400).json({ error: "Please provide the password" });
		if (!username.trim() || !email.trim() || !password.trim())
			return res.status(400).json({ error: "Please provide all the required fields" });

		const isValidEmail = verifyEmail(email); // Use the verifyEmail function to check the validity of the entered email

		if (!isValidEmail) return res.status(400).json({ error: "Invalid email" });

		const existingUser = await User.findOne({ email: req.body.email.trim() });
		if (existingUser) return res.status(400).json({ error: "Email is already registered" });

		const existingUser2 = await User.findOne({ username: req.body.username.trim() });
		if (existingUser2) return res.status(400).json({ error: "Username is already registered" });

		const hashedPassword = await bcrypt.hash(password.trim(), 12);

		const newUser = await User.create({
			username: username.trim(),
			email: email.trim(),
			password: hashedPassword,
			role: "Admin",
		});

		res.status(200).json({ data: { message: "Admin added successfully" } });
	} catch (err) {
		res.status(500).json(err);
	}
};

/**
 * Perform login 
  - Request Body Content: An object having attributes `email` and `password`
  - Response `data` Content: An object with the created accessToken and refreshToken
  - Optional behavior:
    - error 400 is returned if the user does not exist
    - error 400 is returned if the supplied password does not match with the one in the database
 */
export const login = async (req, res) => {
	const { email, password } = req.body;

	if (!email) return res.status(400).json({ error: "Please provide the email" });
	if (!password) return res.status(400).json({ error: "Please provide the password" });
	if (!email.trim() || !password.trim())
		return res.status(400).json({ error: "Please provide all the required fields" });

	// Check if the email is valid or the fields are not empty
	const isValidEmail = verifyEmail(email);
	if (!isValidEmail) return res.status(400).json({ error: "Invalid email" });

	const existingUser = await User.findOne({ email: email });
	if (!existingUser) return res.status(400).json({ error: "User does not exist. Please register first" });

	try {
		const match = await bcrypt.compare(password, existingUser.password);
		if (!match) {
			return res.status(400).json({ error: "Incorrect password" });
		}

		// CREATE ACCESS TOKEN
		const accessToken = jwt.sign(
			{
				email: existingUser.email,
				id: existingUser.id,
				username: existingUser.username,
				role: existingUser.role,
			},
			process.env.ACCESS_KEY,
			{ expiresIn: "1h" }
		);

		// CREATE REFRESH TOKEN
		const refreshToken = jwt.sign(
			{
				email: existingUser.email,
				id: existingUser.id,
				username: existingUser.username,
				role: existingUser.role,
			},
			process.env.ACCESS_KEY,
			{ expiresIn: "7d" }
		);

		// SAVE REFRESH TOKEN TO DB
		existingUser.refreshToken = refreshToken;
		const savedUser = await existingUser.save();

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			domain: "localhost",
			path: "/api",
			maxAge: 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});

		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			domain: "localhost",
			path: "/api",
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});

		res.status(200).json({ data: { accessToken: accessToken, refreshToken: refreshToken } });
	} catch (error) {
		res.status(500).json(error);
	}
};

/**
 * Perform logout
  - Auth type: Simple
  - Request Body Content: None
  - Response `data` Content: A message confirming successful logout
  - Optional behavior:
    - error 400 is returned if the user does not exist
 */
export const logout = async (req, res) => {
	const refreshToken = req.cookies.refreshToken;
	if (!refreshToken) return res.status(400).json({ error: "Refresh token not found" });

	const user = await User.findOne({ refreshToken: refreshToken });
	if (!user) return res.status(400).json({ error: "User not found" });

	try {
		user.refreshToken = null;

		res.cookie("accessToken", "", {
			httpOnly: true,
			path: "/api",
			maxAge: 0,
			sameSite: "none",
			secure: true,
		});

		res.cookie("refreshToken", "", {
			httpOnly: true,
			path: "/api",
			maxAge: 0,
			sameSite: "none",
			secure: true,
		});

		const savedUser = await user.save();

		res.status(200).json({ data: { message: "User logged out" } });
	} catch (error) {
		res.status(500).json(error);
	}
};
