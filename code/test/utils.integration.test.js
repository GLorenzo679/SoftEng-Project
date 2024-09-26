import { verifyAuth } from "../controllers/utils";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

beforeAll(async () => {
	const dbName = "testingDatabaseController";
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

const adminAccessTokenValid = jwt.sign(
	{
		email: "admin@email.com",
		username: "admin",
		role: "Admin",
	},
	process.env.ACCESS_KEY,
	{ expiresIn: "1y" }
);

const testerAccessTokenValid = jwt.sign(
	{
		email: "tester@test.com",
		username: "tester",
		role: "Regular",
	},
	process.env.ACCESS_KEY,
	{ expiresIn: "1y" }
);

const testerAccessTokenExpired = jwt.sign(
	{
		email: "tester@test.com",
		username: "tester",
		role: "Regular",
	},
	process.env.ACCESS_KEY,
	{ expiresIn: "0s" }
);

const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" });

describe("verifyAuth", () => {
	test("should return unauthorized if one token is missing", () => {
		const mockReq = {
			cookies: {},
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });

		expect(response).toEqual({ flag: false, cause: "Unauthorized" });
	});

	test("should return unauthorized if authType is not one valid", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "wrongType", username: "tester" });

		expect(response).toEqual({ flag: false, cause: "Unauthorized" });
	});

	test("should return unauthorized if authType is not one valid and accessToken is expired", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "wrongType", username: "tester" });

		expect(response).toEqual({ flag: false, cause: "Unauthorized" });
	});

	test("should return unauthorized if one token is missing information", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenEmpty, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Token is missing information" });
	});

	test("should return unauthorized if one token is missing information", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenEmpty },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Token is missing information" });
	});

	test("should return unauthorized if one token are from different user", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: adminAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Mismatched users" });
	});

	test("should return simple authorization", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "Simple" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user authorization", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return invalid user", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester2" });
		expect(response).toEqual({ flag: false, cause: "Unauthorized: invalid user" });
	});

	test("should return admin authorization", () => {
		const mockReq = {
			cookies: { accessToken: adminAccessTokenValid, refreshToken: adminAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin", username: "admin" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return invalid admin", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin" });
		expect(response).toEqual({ flag: false, cause: "Unauthorized: not an admin" });
	});

	test("should return group authorization", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, {
			authType: "Group",
			username: "tester",
			emails: ["tester@test.com"],
		});
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user not in group", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, {
			authType: "Group",
			username: "tester2",
			emails: ["wrong@test.com"],
		});
		expect(response).toEqual({ flag: false, cause: "Unauthorized: user is not in requested group" });
	});

	test("should return simple authorization with token refresh", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, { authType: "Simple" });

		//check if new access token in cookies is valid
		expect(jwt.verify(mockRes.cookie.mock.calls[0][1], process.env.ACCESS_KEY).exp - Date.now() / 1000).toBeGreaterThan(
			0
		);
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user authorization with token refresh", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });

		//check if new access token in cookies is valid
		expect(jwt.verify(mockRes.cookie.mock.calls[0][1], process.env.ACCESS_KEY).exp - Date.now() / 1000).toBeGreaterThan(
			0
		);
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user not authorized (with token expired)", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "wrong" });

		expect(response).toEqual({ flag: false, cause: "Unauthorized: invalid user" });
	});

	test("should return admin authorization with token refresh", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: adminAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin" });

		//check if new access token in cookies is valid
		expect(jwt.verify(mockRes.cookie.mock.calls[0][1], process.env.ACCESS_KEY).exp - Date.now() / 1000).toBeGreaterThan(
			0
		);
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return admin not authorized (with token expired)", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin" });
		expect(response).toEqual({ flag: false, cause: "Unauthorized: not an admin" });
	});

	test("should return group authorization with token refresh", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, {
			authType: "Group",
			username: "tester",
			emails: ["tester@test.com"],
		});

		//check if new access token in cookies is valid
		expect(jwt.verify(mockRes.cookie.mock.calls[0][1], process.env.ACCESS_KEY).exp - Date.now() / 1000).toBeGreaterThan(
			0
		);
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user not in group (with token expired)", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};

		const response = verifyAuth(mockReq, mockRes, { authType: "Group", username: "wrong", emails: ["wrong@test.com"] });
		expect(response).toEqual({ flag: false, cause: "Unauthorized: user is not in requested group" });
	});

	test("should raise error and suggest to perform login", () => {
		const mockReq = {
			cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenExpired },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Perform login again" });
	});
});
