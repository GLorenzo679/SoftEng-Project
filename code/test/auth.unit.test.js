import { User } from "../models/User.js";
import { register, registerAdmin, login, logout } from "../controllers/auth";
import { verifyEmail } from "../controllers/utils";
import jwt from "jsonwebtoken";
const bcrypt = require("bcryptjs");

jest.mock("bcryptjs");
jest.mock("../models/User.js");
jest.mock("../controllers/utils.js");
jest.mock("jsonwebtoken");

afterEach(() => {
	jest.clearAllMocks();
});

describe("register", () => {
	test("should return success message when a new user is registered", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const mockHashedPassword = "mockedHashedPassword";
		const mockUser = { username: "testUser", email: "testEmail@example.com", password: mockHashedPassword };
		const mockExistingUser = null;

		bcrypt.hash.mockResolvedValue(mockHashedPassword);
		User.create.mockResolvedValue(mockUser);
		User.findOne.mockResolvedValue(mockExistingUser);
		verifyEmail.mockReturnValue(true);

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "User added successfully" } });
	});

	test("should return error message when username is missing", async () => {
		const mockReq = {
			body: {
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the username" });
	});

	test("should return error message when email is missing", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the email" });
	});

	test("should return error message when password is missing", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				email: "testEmail@example.com",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the password" });
	});

	test("should return error message when required fields have no valid data", async () => {
		const mockReq = {
			body: {
				username: " ",
				email: " ",
				password: " ",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide all the required fields" });
	});

	test("should return error message when email is invalid", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				email: "invalidEmail",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyEmail.mockReturnValue(false);

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid email" });
	});

	test("should return error message when user is already registered with the same email", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		const mockExistingUser = { email: "testEmail@example.com" };
		User.findOne.mockResolvedValue(mockExistingUser);
		verifyEmail.mockReturnValue(true);

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "You are already registered" });
	});

	test("should return error message when user is already registered with the same username", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		const mockExistingUser = { username: "testUser" };
		User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockExistingUser);
		verifyEmail.mockReturnValue(true);

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "You are already registered" });
	});

	test("should return error status and error message when an error occurs during registration", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		const mockError = { message: "Registration error" };
		User.findOne.mockResolvedValue(null);
		verifyEmail.mockReturnValue(true);
		User.create.mockRejectedValueOnce(mockError);

		await register(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(mockError);
	});
});

describe("registerAdmin", () => {
	test("should return success message when a new admin is registered", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				email: "testAdmin@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const mockHashedPassword = "mockedHashedPassword";
		const mockAdmin = { username: "testAdmin", email: "testAdmin@example.com", password: mockHashedPassword };
		const mockExistingAdmin = null;

		bcrypt.hash.mockResolvedValue(mockHashedPassword);
		User.create.mockResolvedValue(mockAdmin);
		User.findOne.mockResolvedValue(mockExistingAdmin);
		verifyEmail.mockReturnValue(true);

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Admin added successfully" } });
	});

	test("should return error message when username is missing", async () => {
		const mockReq = {
			body: {
				email: "testAdmin@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the username" });
	});

	test("should return error message when email is missing", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the email" });
	});

	test("should return error message when password is missing", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				email: "testAdmin@example.com",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the password" });
	});

	test("should return error message when required fields have no valid data", async () => {
		const mockReq = {
			body: {
				username: " ",
				email: " ",
				password: " ",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide all the required fields" });
	});

	test("should return error message when email is invalid", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				email: "invalidEmail",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyEmail.mockReturnValue(false);

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid email" });
	});

	test("should return error message when admin is already registered with the same email", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				email: "testAdmin@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const mockExistingAdmin = { email: "testAdmin@example.com" };

		User.findOne.mockResolvedValue(mockExistingAdmin);
		verifyEmail.mockReturnValue(true);

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email is already registered" });
	});

	test("should return error message when admin is already registered with the same username", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				email: "testAdmin@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const mockExistingAdmin = { username: "testAdmin" };

		User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockExistingAdmin);
		verifyEmail.mockReturnValue(true);

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Username is already registered" });
	});

	test("should return error status and error message when an error occurs during admin registration", async () => {
		const mockReq = {
			body: {
				username: "testAdmin",
				email: "testAdmin@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const mockError = { message: "Registration error" };

		User.findOne.mockResolvedValue(null);
		verifyEmail.mockReturnValue(true);
		User.create.mockRejectedValueOnce(mockError);

		await registerAdmin(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(mockError);
	});
});

describe("login", () => {
	test("should return access token and refresh token when a user logs in successfully", async () => {
		const mockReq = {
			body: {
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};
		const mockExistingUser = {
			email: "testEmail@example.com",
			password: "mockedHashedPassword",
			id: "mockedUserId",
			username: "testUser",
			role: "user",
			save: jest.fn().mockResolvedValue({}),
		};
		const mockAccessToken = "mockedAccessToken";
		const mockRefreshToken = "mockedRefreshToken";
		const bcryptCompareMock = jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
		const jwtSignMock = jest.spyOn(jwt, "sign");

		User.findOne.mockResolvedValue(mockExistingUser);
		jwtSignMock.mockReturnValueOnce(mockAccessToken).mockReturnValueOnce(mockRefreshToken);

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				accessToken: mockAccessToken,
				refreshToken: mockRefreshToken,
			},
		});
		expect(mockRes.cookie).toHaveBeenCalledWith("accessToken", mockAccessToken, {
			httpOnly: true,
			domain: "localhost",
			path: "/api",
			maxAge: 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});
		expect(mockRes.cookie).toHaveBeenCalledWith("refreshToken", mockRefreshToken, {
			httpOnly: true,
			domain: "localhost",
			path: "/api",
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});
		expect(bcryptCompareMock).toHaveBeenCalledWith("testPassword", "mockedHashedPassword");
		expect(jwtSignMock).toHaveBeenCalledWith(
			{
				email: "testEmail@example.com",
				id: "mockedUserId",
				username: "testUser",
				role: "user",
			},
			process.env.ACCESS_KEY,
			{ expiresIn: "1h" }
		);
		expect(jwtSignMock).toHaveBeenCalledWith(
			{
				email: "testEmail@example.com",
				id: "mockedUserId",
				username: "testUser",
				role: "user",
			},
			process.env.ACCESS_KEY,
			{ expiresIn: "7d" }
		);
		expect(mockExistingUser.save).toHaveBeenCalled();
	});

	test("should return error message when email is missing", async () => {
		const mockReq = {
			body: {
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the email" });
	});

	test("should return error message when password is missing", async () => {
		const mockReq = {
			body: {
				email: "testEmail@example.com",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the password" });
	});

	test("should return error message when required fields have no valid data", async () => {
		const mockReq = {
			body: {
				email: " ",
				password: " ",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide all the required fields" });
	});

	test("should return error message when email is invalid", async () => {
		const mockReq = {
			body: {
				email: "invalidEmail",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyEmail.mockReturnValue(false);

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid email" });
	});

	test("should return error message when user does not exist", async () => {
		const mockReq = {
			body: {
				email: "testEmail@example.com",
				password: "testPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		User.findOne.mockResolvedValue(null);
		verifyEmail.mockReturnValue(true);

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User does not exist. Please register first" });
	});

	test("should return error message when password is incorrect", async () => {
		const mockReq = {
			body: {
				email: "testEmail@example.com",
				password: "incorrectPassword",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
		const mockExistingUser = {
			email: "testEmail@example.com",
			password: "mockedHashedPassword",
		};

		bcrypt.compare.mockResolvedValue(false);
		User.findOne.mockResolvedValue(mockExistingUser);

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Incorrect password" });
	});

	test("should return error status and error message when an error occurs during login", async () => {
		const mockError = { message: "Login error" };
		const mockUser = { email: "test@example.com", password: "password" };
		const mockReq = { body: { email: mockUser.email, password: mockUser.password } };
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		// Mock User model
		const User = require("../models/User.js");
		User.findOne = jest.fn().mockResolvedValue(null);
		bcrypt.compare = jest.fn().mockRejectedValue(mockError);

		await login(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(mockError);
	});
});

describe("logout", () => {
	test("should log out the user and return success message", async () => {
		const mockReq = {
			cookies: {
				refreshToken: "mockedRefreshToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		const mockUser = {
			refreshToken: "mockedRefreshToken",
			save: jest.fn().mockResolvedValue(),
		};

		User.findOne.mockResolvedValue(mockUser);

		await logout(mockReq, mockRes);

		expect(User.findOne).toHaveBeenCalledWith({ refreshToken: "mockedRefreshToken" });
		expect(mockUser.refreshToken).toBeNull();
		expect(mockRes.cookie).toHaveBeenCalledWith("accessToken", "", {
			httpOnly: true,
			path: "/api",
			maxAge: 0,
			sameSite: "none",
			secure: true,
		});
		expect(mockRes.cookie).toHaveBeenCalledWith("refreshToken", "", {
			httpOnly: true,
			path: "/api",
			maxAge: 0,
			sameSite: "none",
			secure: true,
		});
		expect(mockUser.save).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "User logged out" } });
	});

	test("should return error when refresh token is not found", async () => {
		const mockReq = {
			cookies: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await logout(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Refresh token not found" });
	});

	test("should return error when user is not found", async () => {
		const mockReq = {
			cookies: {
				refreshToken: "mockedRefreshToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		User.findOne.mockResolvedValue(null);

		await logout(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User not found" });
	});

	test("should return error when an error occurs during logout", async () => {
		const mockReq = {
			cookies: {
				refreshToken: "mockedRefreshToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			cookie: jest.fn(),
		};

		const mockUser = {
			refreshToken: "mockedRefreshToken",
			save: jest.fn().mockRejectedValue(new Error("Save error")),
		};

		User.findOne.mockResolvedValue(mockUser);

		await logout(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(new Error("Save error"));
	});
});
