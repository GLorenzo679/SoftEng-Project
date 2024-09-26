import request from "supertest";
import { app } from "../app";
import { User, Group } from "../models/User.js";
import { transactions, categories } from "../models/model";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

beforeAll(async () => {
	const dbName = "testingDatabaseUsers";
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

//necessary setup to ensure that each test can insert the data it needs
beforeEach(async () => {
	await categories.deleteMany({});
	await transactions.deleteMany({});
	await User.deleteMany({});
	await Group.deleteMany({});
});

/**
 * Alternate way to create the necessary tokens for authentication without using the website
 */
const adminAccessTokenValid = jwt.sign(
	{
		email: "admin@email.com",
		//id: existingUser.id, The id field is not required in any check, so it can be omitted
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

const tester2AccessTokenValid = jwt.sign(
	{
		email: "test2@example.com",
		username: "test2",
		role: "Regular",
	},
	process.env.ACCESS_KEY,
	{ expiresIn: "1y" }
);

//These tokens can be used in order to test the specific authentication error scenarios inside verifyAuth (no need to have multiple authentication error tests for the same route)
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

describe("createCategory", () => {
	test("should return 401 if user is not admin", async () => {
		const response = await request(app)
			.post("/api/categories")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ type: "example", color: "red" });

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if parameters are missing", async () => {
		const response = await request(app)
			.post("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ type: "example" });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if parameters are empty", async () => {
		const response = await request(app)
			.post("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ type: "example", color: "   " });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if category with the same type already exist", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
		]);

		const response = await request(app)
			.post("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ type: "example", color: "white" });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should save the new category and return the data", async () => {
		const response = await request(app)
			.post("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ type: "example", color: "white" });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ type: "example", color: "white" });
	});
});

describe("updateCategory", () => {
	test("should return 401 if user is not admin", async () => {
		const response = await request(app)
			.patch("/api/categories/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
			.send({ type: "example", color: "red" });

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if category to be updated is not in the system", async () => {
		const response = await request(app)
			.patch("/api/categories/example")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ type: "example", color: "red" });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if type or color is missing", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
		]);

		const response = await request(app)
			.patch("/api/categories/example")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ type: "example" });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if type or color is empty", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
		]);

		const response = await request(app)
			.patch("/api/categories/example")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ type: "example2", color: "  " });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if category with specified type already exist", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.patch("/api/categories/example")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ type: "example2", color: "black" });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should update specified category and return a confirmation message and count of updated transaction", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
			{
				username: "admin",
				amount: 200,
				type: "example",
			},
		]);

		const response = await request(app)
			.patch("/api/categories/example")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ type: "example3", color: "black" });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ message: "Category edited successfully", count: 2 });
	});
});

describe("deleteCategory", () => {
	test("should return 401 if user is not admin", async () => {
		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ types: ["example", "example2"] });

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if types is missing", async () => {
		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if types is empty", async () => {
		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ types: [] });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if there is only one category saved", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
		]);
		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ types: ["example"] });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if one type in the array is empty", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);
		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ types: ["   ", "example3"] });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return 400 if one category not exists", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);
		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
			.send({ types: ["example4", "example3"] });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should delete specified categories and return a confirmation message and count of updated transaction", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
			{
				username: "admin",
				amount: 200,
				type: "example",
			},
			{
				username: "admin",
				amount: 200,
				type: "example2",
			},
		]);

		const response = await request(app)
			.delete("/api/categories")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ types: ["example", "example2"] });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ message: "Category deleted successfully", count: 3 });
	});
});

describe("getCategories", () => {
	test("should return 401 if user is not authenticated", async () => {
		const response = await request(app)
			.get("/api/categories")
			.set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("should return all categories saved", async () => {
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		const response = await request(app)
			.get("/api/categories")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(3);
	});

	test("should return 200 and empty array if there is no categories saved", async () => {
		const response = await request(app)
			.get("/api/categories")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});
});

describe("createTransaction", () => {
	test("should return 400 if parameters are missing", async () => {
		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Missing parameters");
	});

	test("should return 400 if parameters are empty", async () => {
		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ username: "  ", type: "    ", amount: "   " });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("should return a 400 error if the category type does not exist", async () => {
		const requestBody = {
			username: "testUser",
			type: "invalidType",
			amount: 10,
		};

		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send(requestBody);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Category does not exist");
	});

	test("should create a new transaction and return the data", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ username: "tester", type: "example", amount: 10 });

		expect(response.status).toBe(200);
		expect(response.body.data).toMatchObject({
			username: "tester",
			type: "example",
			amount: 10,
			date: expect.anything(),
		});
	});

	test("should return a 400 error if the amount is an empty string", async () => {
		await User.insertMany([
			{
				username: "testUser",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ username: "testUser", type: "example", amount: "  " });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("should return a 400 error if the amount is not a number or a string", async () => {
		await User.insertMany([
			{
				username: "testUser",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ username: "testUser", type: "example", amount: { invalidFormat: "invalidFormat" } });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Amount must be a number or a string");
	});

	test("Returns a 400 error if the username passed in the request body does not represent a user in the database", async () => {
		await User.insertMany([
			{
				username: "testUser",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/otherUser/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ username: "otherUser", type: "example", amount: 10 });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("User does not exist");
	});

	test("Returns a 400 error if the username passed in the request body is not equal to the one passed as a route parameter", async () => {
		await User.insertMany([
			{
				username: "testUser",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ username: "otherUser", type: "example", amount: 10 });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Username in body and in url must be the same");
	});

	test("Returns a 400 error if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted)", async () => {
		await User.insertMany([
			{
				username: "testUser",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ username: "testUser", type: "example", amount: "invalid" });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Amount must be a valid numeric string");
	});

	test("Returns a 401 error if called by an authenticated user who is not the same user as the one in the route parameter (authType = User)", async () => {
		await User.insertMany([
			{
				username: "testUser",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
		]);

		const response = await request(app)
			.post("/api/users/testUser/transactions")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`)
			.send({ username: "testUser", type: "example", amount: 12 });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: invalid user");
	});
});

describe("getAllTransactions", () => {
	test("should return all transactions saved", async () => {
		// Create user documents
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},

			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "white",
			},
		]);

		// Create transaction documents with user references
		await transactions.insertMany([
			{
				username: "user1", // reference the user document
				type: "example",
				amount: 10,
				date: "2023-01-01",
			},
			{
				username: "user2",
				type: "example2",
				amount: 10,
				date: "2023-05-01",
			},
			{
				username: "user3",
				type: "example3",
				amount: 30,
				date: "2023-04-01",
			},
		]);

		const response = await request(app)
			.get("/api/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(3);
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		// Create user documents
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},

			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "white",
			},
		]);

		// Create transaction documents with user references
		await transactions.insertMany([
			{
				username: "user1", // reference the user document
				type: "example",
				amount: 10,
				date: "2023-01-01",
			},
			{
				username: "user2",
				type: "example2",
				amount: 10,
				date: "2023-05-01",
			},
			{
				username: "user3",
				type: "example3",
				amount: 30,
				date: "2023-04-01",
			},
		]);

		const response = await request(app)
			.get("/api/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("empty array must be returned if there are no transactions", async () => {
		// Create user documents
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},

			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "white",
			},
		]);

		// Create transaction documents with user references
		await transactions.insertMany([]);

		const response = await request(app)
			.get("/api/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});
});

describe("getTransactionsByUser", () => {
	test("Should retrieve transactions made by a specified user", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(5);
	});

	test("Should retrieve transactions made by a specified user (admin endpoint)", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/transactions/users/tester")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(5);
	});

	test("error 400 is returned if the user does not exist", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/nonexistent/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("User does not exist");
	});

	test("error 400 is returned if the user in parameters is empty", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/   /transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("empty array is returned if there are no transactions made by the user", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});

	test("empty array is returned if there are no transactions made by the user", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		const response = await request(app)
			.get("/api/transactions/users/tester")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/transactions/users/tester")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = User) if the route is `/api/users/:username/transactions`", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions/")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: invalid user");
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/transactions/users/tester")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});
});

describe("getTransactionsByUserByCategory", () => {
	test("should retrieve transactions by user by category specified in the route", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions/category/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(2);
	});

	test("should retrieve transactions by user by category specified in the route", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions/category/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(2);
	});

	test("should return 400 if user passed as parameter is an empty string", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/  /transactions/category/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("should return 400 if category passed as parameter is an empty string", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions/category/   /")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("empty array is returned if there are no transactions made by the user with the specified category", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get("/api/users/tester/transactions/category/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});

	test("error 400 is returned if the user does not exist", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/nonExistentUser/transactions/category/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 400 error if the category passed as a route parameter does not represent a category in the database", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/users/tester/transactions/category/otherCategory")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username/category/:category`", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get("/api/transactions/users/tester/category/example")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions/category/:category`", async () => {
		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "tester", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/users/tester/transactions/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});
});

describe("getTransactionsByGroup", () => {
	test("should retrieve transactions filtered by a Group", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "testGroup2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(5);
	});

	test("should return 400 if the group name passed as parameter is an empty string", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "testGroup2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/groups/  /transactions`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("empty array must be returned if there are no transactions made by the group", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "testGroup2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual([]);
	});

	test("error 400 is returned if the group does not exist", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "testGroup2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/groups/otherGroup/transactions`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group)", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/groups/groupTest2/transactions`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/groups/:name`", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/transactions/groups/groupTest2`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});
});

describe("getTransactionsByGroupByCategory", () => {
	test("should retrieve transactions filtered by a Group and by category", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(2);
	});

	test("empty array must be returned if there are no transactions made by the group with the specified category", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});

	test("should return 400 if group name passed as parameter is an empty string", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/groups/  /transactions/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("should return 400 if category name passed as parameter is an empty string", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions/category/   /`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Empty parameters");
	});

	test("error 400 is returned if the group does not exist", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/groups/otherGroup/transactions/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 400 error if the category passed as a route parameter does not represent a category in the database", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions/category/otherCategory`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `/api/groups/:name/transactions/category/:category`", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/groups/groupTest1/transactions/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/groups/:name/category/:category`", async () => {
		await Group.insertMany([
			{
				name: "groupTest1",
				members: [
					{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
			{
				name: "groupTest2",
				members: [
					{ username: "admin", email: "admin@email.com", password: "admin", refreshToken: adminAccessTokenValid },
				],
			},
		]);

		await User.insertMany([
			{ username: "tester", email: "tester@test.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{ username: "tester", amount: 100, type: "example" },
			{ username: "tester", amount: 200, type: "example2" },
			{ username: "tester", amount: 300, type: "example3" },
			{ username: "tester", amount: 400, type: "example2" },
			{ username: "tester", amount: 500, type: "example" },
		]);

		const response = await request(app)
			.get(`/api/transactions/groups/groupTest2/category/example`)
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});
});

describe("deleteTransaction", () => {
	test("should delete specified transaction and return a confirmation message", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "tester",
				amount: 100,
				type: "example",
			},
		]);

		const tx = await transactions.findOne({ username: "tester" });

		const response = await request(app)
			.delete("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ _id: tx._id });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ message: "Transaction deleted" });
	});

	test("error 400 is returned if the user does not exist", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "tester",
				amount: 100,
				type: "example",
			},
		]);

		const response = await request(app)
			.delete("/api/users/otherUser/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("error 400 is returned if the transaction does not exist", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		const response = await request(app)
			.delete("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ _id: "646cda4f54df6bcdecb2a883" });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Transaction does not exist");
	});

	test("error 401 is returned if the transaction username is not the same as the one passed in parameters", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
		]);

		const tx = await transactions.findOne({ username: "admin" });

		const response = await request(app)
			.delete("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ _id: tx._id });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("User mismatch");
	});

	test("Returns a 400 error if the request body does not contain all the necessary attributes", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([]);

		const response = await request(app)
			.delete("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 400 error if the `_id` in the request body is an empty string", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([]);

		const response = await request(app)
			.delete("/api/users/tester/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ _id: transactions._id });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 400 error if the `_id` in the request body represents a transaction made by a different user than the one in the route", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{
				username: "tester",
				amount: 100,
				type: "example",
			},
		]);

		const tx = await transactions.find({ username: "tester" });

		const response = await request(app)
			.delete("/api/users/admin/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _id: tx._id });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User)", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);

		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
		]);

		const tx = await transactions.find({ username: "admin" });

		const response = await request(app)
			.delete("/api/users/admin/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ _id: tx._id });

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});
});

describe("deleteTransactions", () => {
	test("should delete specified transactions and return a confirmation message", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
			{
				username: "admin",
				amount: 20,
				type: "example2",
			},
			{
				username: "admin",
				amount: 50,
				type: "example3",
			},
		]);

		const tx = await transactions.find({ username: "admin" });
		const _ids = [];
		for (const id of tx) _ids.push(id._id);

		const response = await request(app)
			.delete("/api/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _ids: _ids });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({ message: "Transactions deleted" });
	});

	test("Returns a 400 error if the request body does not contain all the necessary attributes	", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
			{
				username: "admin",
				amount: 20,
				type: "example2",
			},
			{
				username: "admin",
				amount: 50,
				type: "example3",
			},
		]);

		const tx = await transactions.find({ username: "admin" });
		const _ids = [];
		for (const id of tx) _ids.push(id._id);

		const response = await request(app)
			.delete("/api/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 400 error if at least one of the ids in the array is an empty string", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
			{
				username: "admin",
				amount: 20,
				type: "example2",
			},
			{
				username: "admin",
				amount: 50,
				type: "example3",
			},
		]);

		const tx = await transactions.find({ username: "admin" });
		const _ids = [];
		for (const id of tx) _ids.push(id._id);
		_ids.push(" ");

		const response = await request(app)
			.delete("/api/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _ids: _ids });

		expect(response.status).toBe(400);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});

	test("Returns a 400 error if at least one of the ids in the array does not represent a transaction in the database", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "admin",
				amount: 100,
				type: "example",
			},
			{
				username: "admin",
				amount: 20,
				type: "example2",
			},
			{
				username: "admin",
				amount: 50,
				type: "example3",
			},
		]);

		const tx = await transactions.find({ username: "admin" });
		const _ids = [];
		for (const id of tx) _ids.push(id._id);
		_ids.push("646cda4f54df6bcdecb2a883");

		const response = await request(app)
			.delete("/api/transactions")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ _ids: _ids });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("transaction _id is not valid");
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		await User.insertMany([
			{
				username: "tester",
				email: "tester@test.com",
				password: "tester",
				refreshToken: testerAccessTokenValid,
			},
			{
				username: "admin",
				email: "admin@email.com",
				password: "admin",
				refreshToken: adminAccessTokenValid,
				role: "Admin",
			},
		]);
		await categories.insertMany([
			{
				type: "example",
				color: "red",
			},
			{
				type: "example2",
				color: "blue",
			},
			{
				type: "example3",
				color: "blue",
			},
		]);
		await transactions.insertMany([
			{
				username: "tester",
				amount: 100,
				type: "example",
			},
			{
				username: "tester",
				amount: 20,
				type: "example2",
			},
			{
				username: "tester",
				amount: 50,
				type: "example3",
			},
		]);

		const tx = await transactions.find({ username: "tester" });
		const _ids = [];
		for (const id of tx) _ids.push(id._id);

		const response = await request(app)
			.delete("/api/transactions")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ _ids: _ids });

		expect(response.status).toBe(401);
		const errorMessage = response.body.error ? true : response.body.message ? true : false;
		expect(errorMessage).toBe(true);
	});
});
