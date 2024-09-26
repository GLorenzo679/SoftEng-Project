import request from "supertest";
import { app } from "../app";
import { User, Group } from "../models/User.js";
import { transactions, categories } from "../models/model";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

/**
 * Necessary setup in order to create a new database for testing purposes before starting the execution of test cases.
 * Each test suite has its own database in order to avoid different tests accessing the same database at the same time and expecting different data.
 */
dotenv.config();

beforeAll(async () => {
	const dbName = "testingDatabaseUsers";
	const url = `${process.env.MONGO_URI}/${dbName}`;

	await mongoose.connect(url, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
});

/**
 * After all test cases have been executed the database is deleted.
 * This is done so that subsequent executions of the test suite start with an empty database.
 */
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

const adminAccessTokenValid = jwt.sign(
	{
		email: "admin@example.com",
		username: "admin",
		role: "Admin",
	},
	process.env.ACCESS_KEY,
	{ expiresIn: "1y" }
);

const testerAccessTokenValid = jwt.sign(
	{
		email: "test@example.com",
		username: "test",
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

const testerAccessTokenExpired = jwt.sign(
	{
		email: "test@example.com",
		username: "test",
		role: "Regular",
	},
	process.env.ACCESS_KEY,
	{ expiresIn: "0s" }
);

const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" });

describe("getUsers", () => {
	test("should retrieve list of all users", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const response = await request(app)
			.get("/api/users")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(3);
	});

	test("should return an empty list if there are no users", async () => {
		const response = await request(app)
			.get("/api/users")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});

	test("should return 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const response = await request(app)
			.get("/api/users")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});
});

describe("getUser", () => {
	test("should return an error if the user is not found", async () => {
		await User.insertMany([
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);
		const response = await request(app)
			.get("/api/users/nonExistentUser")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);
		expect(response.status).toBe(400);
		expect(response.body.error).toBe("User not found");
	});

	test("should return an error if the user is not authorized an USer or Admin", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
		]);
		const response = await request(app)
			.get("/api/users/test")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`);
		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});

	test("should return an error if the user passed as parameter is empty", async () => {
		const response = await request(app)
			.get("/api/users/  /")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`);
		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide an username");
	});

	test("should return user data", async () => {
		await User.insertMany([
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);
		const response = await request(app)
			.get("/api/users/admin")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);
		expect(response.status).toBe(200);
		expect(response.body.data.email).toBe("admin@example.com");
	});
});

describe("createGroup", () => {
	test("should create a new group", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "testGroup",
				members: [
					{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
		]);

		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({
				name: "testGroup2",
				memberEmails: ["test@example.com", "test2@example.com", "invalidEmail@example.com"],
			});

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("group");
		expect(response.body.data).toHaveProperty("alreadyInGroup");
		expect(response.body.data).toHaveProperty("membersNotFound");
		expect(response.body.data.alreadyInGroup).toHaveLength(1);
		expect(response.body.data.membersNotFound).toHaveLength(1);
		expect(response.body.data.group.name).toBe("testGroup2");
	});

	test("should return 400 error if the request body does not contain all the necessary attributes", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ memberEmails: ["test@example.com", "admin@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return 400 error if the request body does not contain all the necessary attributes", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup" });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group members provided");
	});

	test("should return 400 error if the group name passed in the request body is an empty string", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "  ", memberEmails: ["test@example.com", "admin@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return 400 error if the email array is empty", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup", memberEmails: [] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group members provided");
	});

	test("should return 400 error if one of the email is an empty string", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup", memberEmails: ["  ", "admin@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email has an invalid format");
	});

	test("should return 400 error if the group name passed in the request body represents an already existing group in the database", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const users = await User.find({});

		await Group.insertMany([
			{
				name: "testGroup",
				members: users,
			},
		]);

		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup", memberEmails: ["test@example.com", "admin@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Group already exists");
	});

	test("should return 400 error if the calling user is already in a group", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "testGroup2",
				members: [
					{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
					{
						username: "admin",
						email: "admin@example.com",
						password: "admin",
						role: "Admin",
						refreshToken: adminAccessTokenValid,
					},
				],
			},
		]);

		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup", memberEmails: ["test2@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Calling user is already in a group");
	});

	test("should return 400 error if at least one of the member emails is not in a valid email format", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup", memberEmails: ["invalidEmailFormat", "test2@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email has an invalid format");
	});

	test("should return 400 error if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [
					{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
				],
			},
			{
				name: "testGroup2",
				members: [
					{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
		]);

		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ name: "testGroup", memberEmails: ["test2@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No valid group members provided");
	});

	test("should return 401 error if called by a user who is not authenticated (authType = Simple)", async () => {
		const response = await request(app)
			.post("/api/groups/")
			.set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`)
			.send({ name: "testGroup", memberEmails: ["test2@example.com"] });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Perform login again");
	});
});

describe("getGroups", () => {
	test("should return list of all groups", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const users = await User.find({});

		await Group.insertMany([
			{
				name: "testGroup1",
				members: users,
			},
			{
				name: "testGroup2",
				members: users,
			},
		]);

		const response = await request(app)
			.get("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data[0].name).toEqual("testGroup1");
		expect(response.body.data[0].members[0].email).toEqual(users[0].email);
	});

	test("should return empty list if there are no groups", async () => {
		await Group.insertMany([]);

		const response = await request(app)
			.get("/api/groups/")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		const response = await request(app)
			.get("/api/groups/")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});
});

describe("getGroup", () => {
	test("should return group with given name", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const users = await User.find({});

		await Group.insertMany([
			{
				name: "testGroup1",
				members: users,
			},
			{
				name: "testGroup2",
				members: users,
			},
		]);

		const response = await request(app)
			.get("/api/groups/testGroup1")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data.name).toEqual("testGroup1");
		expect(response.body.data.members[0].email).toEqual(users[0].email);
	});

	test("should return a 400 error if the group name passed as a route parameter does not represent a group in the database", async () => {
		const response = await request(app)
			.get("/api/groups/incorrectGroupName")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Group doesn't exists");
	});

	test("should return a 400 error if the group name passed as a route parameter is and empty string", async () => {
		const response = await request(app)
			.get("/api/groups/   /")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		await User.create([
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const users = await User.find({});

		await Group.insertMany([
			{
				name: "testGroup1",
				members: users,
			},
		]);

		const response = await request(app)
			.get("/api/groups/testGroup1")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});
});

describe("addToGroup", () => {
	test("should return 200 and add user to group (member of group)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/add")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(200);
		expect(response.body.data.group.name).toEqual("testGroup1");
		expect(response.body.data.group.members).toHaveLength(3);
		expect(response.body.data.alreadyInGroup).toHaveLength(1);
		expect(response.body.data.membersNotFound).toHaveLength(1);
	});

	test("should return 200 and add user to group (admin)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(200);
		expect(response.body.data.group.name).toEqual("testGroup1");
		expect(response.body.data.group.members).toHaveLength(3);
		expect(response.body.data.alreadyInGroup).toHaveLength(1);
		expect(response.body.data.membersNotFound).toHaveLength(1);
	});

	test("should return 400 error if the request body does not contain all the necessary attributes", async () => {
		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group members provided");
	});

	test("should return 400 error if the emails array in the request body is empty", async () => {
		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: [] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group members provided");
	});

	test("should return 400 error if at least one email in the emails array in the request body is an empty string", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", ""] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email has an invalid format");
	});

	test("should return 400 error if at least one email in the emails array in the request body has an invalid format", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmailFormat"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email has an invalid format");
	});

	test("should return 400 error if the group name passed as a route parameter does not represent a group in the database", async () => {
		const response = await request(app)
			.patch("/api/groups/invalidGroupName/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmailFormat"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Group doesn't exists");
	});

	test("should return 400 error if no group name is provided", async () => {
		const response = await request(app)
			.patch("/api/groups/  /insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmailFormat"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return 400 error if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No valid group members provided");
	});

	test("should return 401 error if called by an authenticated user who is not part of the group (authType = Group)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/add")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: user is not in requested group");
	});

	test("should return 401 error if called by an authenticated user who is not part of the group (authType = Admin)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/insert")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});
});

describe("removeFromGroup", () => {
	test("should return 200 and add user to group (member of group)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/add")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(200);
		expect(response.body.data.group.name).toEqual("testGroup1");
		expect(response.body.data.group.members).toHaveLength(3);
		expect(response.body.data.alreadyInGroup).toHaveLength(1);
		expect(response.body.data.membersNotFound).toHaveLength(1);
	});

	test("should return 200 and remove user from group (admin)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, user2],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(200);
		expect(response.body.data.group.name).toEqual("testGroup1");
		expect(response.body.data.group.members).toHaveLength(1);
		expect(response.body.data.notInGroup).toHaveLength(1);
		expect(response.body.data.membersNotFound).toHaveLength(1);
	});

	test("should return 400 error if the request body does not contain all the necessary attributes", async () => {
		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({});

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group members provided");
	});

	test("should return 400 error if the emails array in the request body is empty", async () => {
		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: [] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group members provided");
	});

	test("should return 400 error if at least one email in the emails array in the request body is an empty string", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", ""] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email has an invalid format");
	});

	test("should return 400 error if at least one email in the emails array in the request body has an invalid format", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmailFormat"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Email has an invalid format");
	});

	test("should return 400 error if the group name passed as a route parameter does not represent a group in the database", async () => {
		const response = await request(app)
			.patch("/api/groups/invalidGroupName/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmailFormat"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Group doesn't exists");
	});

	test("should return 400 error if no group name is provided", async () => {
		const response = await request(app)
			.patch("/api/groups/  /pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmailFormat"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return 400 error if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user2, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No valid group members provided");
	});

	test("should return 400 error if trying to remove last member in group", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user2],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
			.send({ emails: ["test@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Cannot remove last member");
	});

	test("should return 401 error if called by an authenticated user who is not part of the group (authType = Group)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/remove")
			.set("Cookie", `accessToken=${tester2AccessTokenValid}; refreshToken=${tester2AccessTokenValid}`)
			.send({ emails: ["test@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: user is not in requested group");
	});

	test("should return 401 error if called by an authenticated user who is not part of the group (authType = Admin)", async () => {
		const user1 = {
			username: "test",
			email: "test@example.com",
			password: "test",
			refreshToken: testerAccessTokenValid,
		};
		const user2 = {
			username: "test2",
			email: "test2@example.com",
			password: "test2",
			refreshToken: tester2AccessTokenValid,
		};
		const admin = {
			username: "admin",
			email: "admin@example.com",
			password: "admin",
			role: "Admin",
			refreshToken: adminAccessTokenValid,
		};

		await User.insertMany([user1, user2, admin]);

		await Group.insertMany([
			{
				name: "testGroup1",
				members: [user1, admin],
			},
		]);

		const response = await request(app)
			.patch("/api/groups/testGroup1/pull")
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
			.send({ emails: ["test2@example.com", "admin@example.com", "invalidEmail@example.com"] });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});
});

describe("deleteUser", () => {
	test("should return an error if email is not provided", async () => {
		const response = await request(app)
			.delete("/api/users")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Please provide the all the fields");
	});

	test("should return an error if email format is invalid", async () => {
		const response = await request(app)
			.delete("/api/users")
			.send({ email: "invalidEmail" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Invalid email format");
	});

	test("should return an error if user does not exist", async () => {
		const response = await request(app)
			.delete("/api/users")
			.send({ email: "nonexistent@example.com" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("User does not exist");
	});

	test("should return an error if the authenticated user is not an admin", async () => {
		await User.insertMany([
			{
				username: "test",
				email: "test@example.com",
				password: "test",
				refreshToken: testerAccessTokenValid,
			},
		]);

		const response = await request(app)
			.delete("/api/users")
			.send({ email: "test@example.com" })
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});

	test("should return an error if trying to delete an admin user", async () => {
		await User.insertMany([
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		const response = await request(app)
			.delete("/api/users")
			.send({ email: "admin@example.com" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Cannot delete an admin user");
	});

	test("should delete the user's data and remove user from groups", async () => {
		await User.insertMany([
			{
				username: "test",
				email: "test@example.com",
				password: "test",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "Group 1",
				members: [
					{
						email: "test@example.com",
						username: "test",
					},
					{
						email: "user@example.com",
						username: "user",
					},
				],
			},
			{
				name: "Group 2",
				members: [
					{
						email: "test@example.com",
						username: "test",
					},
					{
						email: "another@example.com",
						username: "another",
					},
				],
			},
		]);
		await transactions.insertMany([
			{
				username: "test",
				category: "Category 1",
				amount: 10,
			},
			{
				username: "test",
				category: "Category 2",
				amount: 20,
			},
		]);

		const response = await request(app)
			.delete("/api/users")
			.send({ email: "test@example.com" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data.deletedTransactions).toBeGreaterThan(0);
		expect(response.body.data.deletedFromGroup).toBe(true);
	});

	test("should delete the group if no members remain", async () => {
		await User.insertMany([
			{
				username: "test",
				email: "test@example.com",
				password: "test",
				refreshToken: testerAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "Group 1",
				members: [
					{
						email: "test@example.com",
						username: "test",
					},
				],
			},
		]);
		await transactions.insertMany([
			{
				username: "test",
				category: "Category 1",
				amount: 10,
			},
			{
				username: "test",
				category: "Category 2",
				amount: 20,
			},
		]);

		const response = await request(app)
			.delete("/api/users")
			.send({ email: "test@example.com" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data.deletedFromGroup).toBe(true);
		const groupCount = await Group.countDocuments();
		expect(groupCount).toBe(0);
	});
});

describe("deleteGroup", () => {
	test("should return 200 and a message confirming deletion", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "testGroup",
				members: [
					{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
		]);

		const response = await request(app)
			.delete("/api/groups")
			.send({ name: "testGroup" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(200);
		expect(response.body.data.message).toBe("Group deleted");
	});

	test("should return 400 error if the request body does not contain all the necessary attributes", async () => {
		const response = await request(app)
			.delete("/api/groups")
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return 400 error if the name passed in the request body is an empty string", async () => {
		const response = await request(app)
			.delete("/api/groups")
			.send({ name: " " })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("No group name provided");
	});

	test("should return 400 error if the name passed in the request body does not represent a group in the database", async () => {
		const response = await request(app)
			.delete("/api/groups")
			.send({ name: "testGroup" })
			.set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`);

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Group doesn't exists");
	});

	test("should return 400 error if the name passed in the request body does not represent a group in the database", async () => {
		await User.insertMany([
			{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
			{ username: "test2", email: "test2@example.com", password: "test2", refreshToken: tester2AccessTokenValid },
			{
				username: "admin",
				email: "admin@example.com",
				password: "admin",
				role: "Admin",
				refreshToken: adminAccessTokenValid,
			},
		]);

		await Group.insertMany([
			{
				name: "testGroup",
				members: [
					{ username: "test", email: "test@example.com", password: "test", refreshToken: testerAccessTokenValid },
				],
			},
		]);

		const response = await request(app)
			.delete("/api/groups")
			.send({ name: "testGroup" })
			.set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`);

		expect(response.status).toBe(401);
		expect(response.body.error).toBe("Unauthorized: not an admin");
	});
});
