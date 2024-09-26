import request from "supertest";
import { app } from "../app";
import { User } from "../models/User";
import { logout } from "../controllers/auth.js";
import jwt from "jsonwebtoken";
const bcrypt = require("bcryptjs");
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

jest.mock("jsonwebtoken", () => ({
	sign: jest.fn(() => "mocked-access-token"),
}));

beforeAll(async () => {
	const dbName = "testingDatabaseAuth";
	const url = `${process.env.MONGO_URI}/${dbName}`;
	await mongoose.connect(url, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
});

afterAll(async () => {
	await mongoose.connection.db.dropDatabase();
	await mongoose.connection.close();
});

beforeEach(async () => {
	await User.deleteMany({});
});

describe("register", () => {
	test("should register a new user and return success message", async () => {
		const userData = {
			username: "testUser",
			email: "test@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(200);
		expect(response.body.data.message).toBe("User added successfully");
	});

	test("should return an error if username is missing", async () => {
		const userData = {
			email: "test@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the username");
	});

	test("should return an error if email is missing", async () => {
		const userData = {
			username: "testUser",
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the email");
	});

	test("should return an error if password is missing", async () => {
		const userData = {
			username: "testUser",
			email: "test@example.com",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the password");
	});

	test("should return an error if required fields are missing", async () => {
		const userData = {
			username: " ",
			email: " ",
			password: " ",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide all the required fields");
	});

	test("should return an error message if required fields are missing", async () => {
		const userData = {
			username: "testUser",
			email: "", // Empty email
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the email");
	});

	test("should return an error message if email is invalid", async () => {
		const userData = {
			username: "testUser",
			email: "invalidEmail",
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Invalid email");
	});

	test("should return an error message if email is already registered", async () => {
		await User.create({
			username: "existingUser",
			email: "test@example.com",
			password: "existingPassword",
		});
		const userData = {
			username: "testUser",
			email: "test@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("You are already registered");
	});

	test("should return an error message if username is already taken", async () => {
		await User.create({
			username: "testUser",
			email: "existing@example.com",
			password: "existingPassword",
		});
		const userData = {
			username: "testUser",
			email: "test@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/register").send(userData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("You are already registered");
	});
});

describe("registerAdmin", () => {
	test("should register a new admin and return success message", async () => {
		const adminData = {
			username: "testAdmin",
			email: "testAdmin@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(200);
		expect(response.body.data.message).toBe("Admin added successfully");
	});

	test("should return an error if username is missing", async () => {
		const adminData = {
			email: "testAdmin@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the username");
	});

	test("should return an error if email is missing", async () => {
		const adminData = {
			username: "testAdmin",
			password: "securePassword",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the email");
	});

	test("should return an error if password is missing", async () => {
		const adminData = {
			username: "testAdmin",
			email: "testAdmin@example.com",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the password");
	});

	test("should return an error if required fields are missing", async () => {
		const adminData = {
			username: " ",
			email: " ",
			password: " ",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide all the required fields");
	});

	test("should return an error message if email is invalid", async () => {
		const adminData = {
			username: "testAdmin",
			email: "invalidEmail",
			password: "securePassword",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Invalid email");
	});

	test("should return an error message if email is already registered", async () => {
		await User.create({
			username: "existingAdmin",
			email: "testAdmin@example.com",
			password: "existingPassword",
			role: "Admin",
		});
		const adminData = {
			username: "testAdmin",
			email: "testAdmin@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email is already registered");
	});

	test("should return an error message if username is already taken", async () => {
		await User.create({
			username: "testAdmin",
			email: "existingadmin@example.com",
			password: "existingPassword",
			role: "Admin",
		});
		const adminData = {
			username: "testAdmin",
			email: "testAdmin@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/admin").send(adminData);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Username is already registered");
	});
});

describe("login", () => {
	test("should return access and refresh tokens upon successful login", async () => {
		const existingUser = {
			username: "testing",
			email: "test@example.com",
			password: "password",
			role: "Admin",
		};

		const createdUser = await User.create(existingUser);

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

		createdUser.refreshToken = refreshToken;
		createdUser.accessToken = accessToken;
		await createdUser.save();
		bcrypt.compare = jest.fn().mockResolvedValue(true);
		// Make the login request
		const response = await request(app).post("/api/login").send({ email: "test@example.com", password: "password" });

		// Perform assertions
		expect(response.status).toBe(200);
		expect(response.body.data.accessToken).toBe(accessToken);
		expect(response.body.data.refreshToken).toBe(refreshToken);
	});

	test("should return an error if email is missing", async () => {
		const credentials = {
			password: "securePassword",
		};
		const response = await request(app).post("/api/login").send(credentials);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the email");
	});

	test("should return an error if password is missing", async () => {
		const credentials = {
			email: "testUser@example.com",
		};
		const response = await request(app).post("/api/login").send(credentials);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the password");
	});

	test("should return an error if required fields are missing", async () => {
		const credentials = {
			email: " ",
			password: " ",
		};
		const response = await request(app).post("/api/login").send(credentials);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide all the required fields");
	});

	test("should return an error message if email is invalid", async () => {
		const credentials = {
			email: "invalidEmail",
			password: "securePassword",
		};
		const response = await request(app).post("/api/login").send(credentials);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Invalid email");
	});

	test("should return an error message if user does not exist", async () => {
		const credentials = {
			email: "nonexistent@example.com",
			password: "securePassword",
		};
		const response = await request(app).post("/api/login").send(credentials);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("User does not exist. Please register first");
	});
});

describe("logout", () => {
	const testerAccessTokenValid = jwt.sign(
		{
			email: "test@example.com",
			username: "test",
			role: "Regular",
		},
		process.env.ACCESS_KEY,
		{ expiresIn: "1y" }
	);

	test("should log out a user and return success message", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
		]);

		const response = await request(app)
			.get("/api/logout")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ data: { message: "User logged out" } });
	});

	test("should return an error if user is not found", async () => {
		const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" });

		const response = await request(app)
			.get("/api/logout")
			.set("Cookie", `accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`);

		expect(response.status).toBe(400);
		expect(response.body).toEqual({ error: "User not found" });
	});

	test("should return an error if refresh token is not found", async () => {
		const response = await request(app).get("/api/logout").set("Cookie", `accessToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body).toEqual({ error: "Refresh token not found" });
	});
});
