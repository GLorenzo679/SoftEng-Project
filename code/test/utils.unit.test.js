import { handleDateFilterParams, verifyAuth, handleAmountFilterParams } from "../controllers/utils";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

afterEach(() => {
	jest.clearAllMocks();
});

describe("handleDateFilterParams", () => {
	test("should raise error if there is date with from/up to", () => {
		const mockReq = {
			query: { date: "2021-01-01", from: "2021-01-01", upTo: "2021-01-01" },
		};
		expect(() => {
			handleDateFilterParams(mockReq);
		}).toThrow("Cannot use date together with from or upTo");
	});

	test("should raise error if there is date, from, up to wrong format", () => {
		const mockReq1 = {
			query: { date: "a" },
		};
		const mockReq2 = {
			query: { from: "b" },
		};
		const mockReq3 = {
			query: { upTo: "c" },
		};
		const mockReq4 = {
			query: { from: "b", upTo: "c" },
		};
		expect(() => {
			handleDateFilterParams(mockReq1);
		}).toThrow();
		expect(() => {
			handleDateFilterParams(mockReq2);
		}).toThrow();
		expect(() => {
			handleDateFilterParams(mockReq3);
		}).toThrow();
		expect(() => {
			handleDateFilterParams(mockReq4);
		}).toThrow();
	});

	test("should accept no query params", () => {
		const mockReq = {
			query: {},
		};
		let result = handleDateFilterParams(mockReq);
		expect(result).toEqual({ date: { $exists: true } });
	});

	test("should manage different params combination", () => {
		const mockReq1 = {
			query: { date: "2021-01-01" },
		};
		const mockReq2 = {
			query: { from: "2021-01-01" },
		};
		const mockReq3 = {
			query: { upTo: "2021-01-01" },
		};
		const mockReq4 = {
			query: { from: "2021-01-01", upTo: "2022-01-01" },
		};
		let result1 = handleDateFilterParams(mockReq1);
		let result2 = handleDateFilterParams(mockReq2);
		let result3 = handleDateFilterParams(mockReq3);
		let result4 = handleDateFilterParams(mockReq4);
		expect(result1).toHaveProperty("date");
		expect(result1.date).toHaveProperty("$gte");
		expect(result1.date).toHaveProperty("$lte");
		expect(result2).toHaveProperty("date");
		expect(result2.date).toHaveProperty("$gte");
		expect(result3).toHaveProperty("date");
		expect(result3.date).toHaveProperty("$lte");
		expect(result4).toHaveProperty("date");
		expect(result4.date).toHaveProperty("$gte");
		expect(result4.date).toHaveProperty("$lte");
	});
});

describe("verifyAuth", () => {
	test("should return unauthorized if one token is missing", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid" },
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Unauthorized" });
	});

	test("should return unauthorized if one token is missing information", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Token is missing information" });
	});

	test("should return unauthorized if one token is missing information", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Token is missing information" });
	});

	test("should return unauthorized if one token are from different user", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester2",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Mismatched users" });
	});

	test("should return simple authorization", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "Simple" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user authorization", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user authorization with expired date", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
			exp: 0,
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return invalid user", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester2" });
		expect(response).toEqual({ flag: false, cause: "Unauthorized: invalid user" });
	});

	test("should return admin authorization", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Admin",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Admin",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin", username: "tester" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return admin authorization with expired date", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Admin",
			exp: 0,
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Admin",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin", username: "tester" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return invalid admin", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "Admin", username: "tester2" });
		expect(response).toEqual({ flag: false, cause: "Unauthorized: not an admin" });
	});

	test("should return group authorization", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, {
			authType: "Group",
			username: "tester",
			emails: ["tester@test.com"],
		});
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return group authorization with expired date", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
			exp: 0,
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, {
			authType: "Group",
			username: "tester",
			emails: ["tester@test.com"],
		});
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should return user not in group", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		jwt.verify.mockReturnValueOnce(decodedAccessToken);
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);

		const response = verifyAuth(mockReq, mockRes, {
			authType: "Group",
			username: "tester2",
			emails: ["wrong@test.com"],
		});
		expect(response).toEqual({ flag: false, cause: "Unauthorized: user is not in requested group" });
	});

	test("should return user authorization", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = {
			cookie: jest.fn(),
			locals: {
				refreshTokenMessage: {},
			},
		};
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		const error = new Error("Token expired");
		error.name = "TokenExpiredError";

		jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
			throw error;
		});
		jwt.verify.mockReturnValueOnce(decodedRefreshToken);
		jwt.sign.mockReturnValueOnce(decodedAccessToken);

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: true, cause: "Authorized" });
	});

	test("should raise error and suggest to perform login", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = { cookie: jest.fn() };
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		const error = new Error("Token expired");
		error.name = "TokenExpiredError";

		jest.spyOn(jwt, "verify").mockImplementation(() => {
			throw error;
		});

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Perform login again" });
	});

	test("should raise error", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = { cookie: jest.fn() };
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};

		const error = new Error("Token expired");
		error.name = "TokenExpiredError";

		jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
			throw error;
		});
		jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
			throw new Error();
		});

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Error" });
	});

	test("should raise error", () => {
		const mockReq = {
			cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerRefreshTokenValid" },
		};
		const mockRes = { cookie: jest.fn() };
		const decodedAccessToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		const decodedRefreshToken = {
			email: "tester@test.com",
			username: "tester",
			role: "Regular",
		};
		jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
			throw new Error();
		});

		const response = verifyAuth(mockReq, mockRes, { authType: "User", username: "tester" });
		expect(response).toEqual({ flag: false, cause: "Error" });
	});
});

describe("handleAmountFilterParams", () => {
	test("should accept no query params", () => {
		const mockReq = {
			query: {},
		};
		let result = handleAmountFilterParams(mockReq);
		expect(result).toEqual({ amount: { $exists: true } });
	});

	test("should accept single params", () => {
		const mockReq1 = {
			query: { max: 100 },
		};
		const mockReq2 = {
			query: { min: 100 },
		};
		let result1 = handleAmountFilterParams(mockReq1);
		let result2 = handleAmountFilterParams(mockReq2);
		expect(result1).toEqual({ amount: { $lte: parseFloat(mockReq1.query.max) } });
		expect(result2).toEqual({ amount: { $gte: parseFloat(mockReq2.query.min) } });
	});

	test("should accept min, max query params", () => {
		const mockReq = {
			query: { min: 100, max: 200 },
		};
		let result = handleAmountFilterParams(mockReq);
		expect(result).toEqual({ amount: { $gte: parseFloat(mockReq.query.min), $lte: parseFloat(mockReq.query.max) } });
	});

	test("should raise error if params isNan", () => {
		const mockReq1 = {
			query: { min: "a" },
		};
		const mockReq2 = {
			query: { max: "a" },
		};
		const mockReq3 = {
			query: { min: 100, max: "a" },
		};
		expect(() => {
			handleAmountFilterParams(mockReq1);
		}).toThrow("Invalid amount parameters");
		expect(() => {
			handleAmountFilterParams(mockReq2);
		}).toThrow("Invalid amount parameters");
		expect(() => {
			handleAmountFilterParams(mockReq3);
		}).toThrow("Invalid amount parameters");
	});
});
