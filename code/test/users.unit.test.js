import { User, Group } from "../models/User.js";
import { transactions } from "../models/model";
import { getGroup, getGroups, createGroup, addToGroup, removeFromGroup, deleteGroup } from "../controllers/users";
import { verifyAuth, verifyEmail } from "../controllers/utils";
import jwt from "jsonwebtoken";
import { getUser, getUsers, deleteUser } from "../controllers/users";

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock("../models/User.js");
jest.mock("../controllers/utils.js");
jest.mock("../models/model.js");
jest.mock("jsonwebtoken");

/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
beforeEach(() => {
	User.find.mockClear();
	User.findOne.mockClear();
	Group.findOne.mockClear();
	Group.find.mockClear();
	Group.updateOne.mockClear();
	verifyAuth.mockClear();
	//additional `mockClear()` must be placed here
});

afterEach(() => {
	jest.clearAllMocks();
});

describe("getUsers", () => {
	test("should return the list of users with a 200 status code", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockUsers = [
			{ username: "user1", email: "user1@example.com", role: "Admin" },
			{ username: "user2", email: "user2@example.com", role: "Regular" },
		];

		jest.spyOn(User, "find").mockResolvedValueOnce(mockUsers);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getUsers(mockReq, mockRes);

		expect(User.find).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: mockUsers, refreshedTokenMessage: "Token refreshed" });
	});

	test("should return a 401 error if authentication fails", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an error occurs", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, "find").mockRejectedValueOnce(new Error("Database error"));
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getUsers(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("getUser", () => {
	test("should return user data with a 200 status code", async () => {
		const mockReq = {
			params: {
				username: "user1",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockUser = {
			username: "user1",
			email: "user1@example.com",
			role: "user",
		};

		jest.spyOn(User, "findOne").mockResolvedValueOnce(mockUser);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getUser(mockReq, mockRes);

		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: mockUser,
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return a 400 error if username is missing", async () => {
		const mockReq = {
			params: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide an username" });
	});

	test("should return a 400 error if username is an empty string", async () => {
		const mockReq = {
			params: {
				username: "  ",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide an username" });
	});

	test("should return a 401 error if both user and admin authentication fail", async () => {
		const mockReq = {
			params: {
				username: "user1",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 400 error if user is not found", async () => {
		const mockReq = {
			params: {
				username: "user1",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, "findOne").mockResolvedValueOnce(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User not found" });
	});

	test("should return a 500 error if an error occurs", async () => {
		const mockReq = {
			params: {
				username: "user1",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("Database error"));
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("createGroup", () => {
	test("should create a new group", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce({ email: "test1@example.com" });
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce({ email: "test2@example.com" });
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jwt.verify.mockReturnValueOnce({ email: "testuser@example.com" });
		jest.spyOn(Group, "create").mockResolvedValueOnce({
			save: jest.fn().mockResolvedValueOnce({
				name: "testGroup",
				members: ["test1@example.com", "test2@example.com", "testuser@example.com"],
			}),
		});

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(Group.create).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				group: { name: "testGroup", members: ["test1@example.com", "test2@example.com", "testuser@example.com"] },
				alreadyInGroup: [],
				membersNotFound: [],
			},
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockReq = {
			body: { name: "testGroup" },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group members provided" });
	});

	test("should return a 400 error if the group name passed in the request body is an empty string", async () => {
		const mockReq = {
			body: { name: "", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await createGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return a 400 error if the group name passed in the request body represents an already existing group in the database", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		Group.findOne.mockResolvedValue({
			name: "testGroup",
			members: ["test1@example.com", "test2@example.com", "testuser@example.com"],
		});

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group already exists" });
	});

	test("should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce({ email: "test2@example.com" });
		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] });

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No valid group members provided" });
	});

	test("should return a 400 error if the user who calls the API is already in a group", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce({ email: "test1@example.com" });
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce({ email: "test2@example.com" });
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jwt.verify.mockReturnValueOnce({ email: "testuser@example.com" });
		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] });

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Calling user is already in a group" });
	});

	test("should return a 400 error if a member email has not a valid format", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "invalidEmailFormat"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyEmail.mockImplementation(() => false);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email has an invalid format" });
	});

	test("should return a 400 error if at least one of the member emails is an empty string", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", ""] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyEmail.mockImplementation(() => true);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email has an invalid format" });
	});

	test("should return a 401 error if the user is not authorized", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await createGroup(mockReq, mockRes);

		expect(verifyAuth).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		const mockReq = {
			body: { name: "testGroup", memberEmails: ["test1@example.com", "test2@example.com"] },
			cookies: {
				accessToken: "fakeAccessToken",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		Group.findOne.mockRejectedValueOnce(new Error("Database error"));

		await createGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("getGroups", () => {
	const mockReq = {};
	const mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		locals: {
			refreshedTokenMessage: "Token refreshed",
		},
	};

	test("should return list of all groups", async () => {
		const retrievedGroups = [
			{ name: "testGroup1", members: ["test1", "test2"] },
			{ name: "testGroup2", members: ["test3", "test4"] },
			{ name: "testGroup3", members: ["test5", "test6"] },
		];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		jest.spyOn(Group, "find").mockImplementation(() => retrievedGroups);
		await getGroups(mockReq, mockRes);

		expect(Group.find).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: retrievedGroups, refreshedTokenMessage: "Token refreshed" });
	});

	test("should return an empty list", async () => {
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		jest.spyOn(Group, "find").mockImplementation(() => []);
		await getGroups(mockReq, mockRes);

		expect(Group.find).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: "Token refreshed" });
	});

	test("should return 401 if user is not authorized", async () => {
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getGroups(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		Group.find.mockRejectedValueOnce(new Error("Database error"));

		await getGroups(mockReq, mockRes);

		expect(Group.find).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("getGroup", () => {
	const mockReq = {
		params: { name: "testGroup" },
	};
	const mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		locals: {
			refreshedTokenMessage: "Token refreshed",
		},
	};

	test("should return requested group", async () => {
		const retrievedGroup = { name: "testGroup", members: ["test1", "test2"] };

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(retrievedGroup);
		await getGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: retrievedGroup, refreshedTokenMessage: "Token refreshed" });
	});

	test("should return 400 if group does not exist", async () => {
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		await getGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group doesn't exists" });
	});

	test("should return 400 if group name is not provided", async () => {
		const mockReq = {
			params: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return 400 if group name is an empty string", async () => {
		const mockReq = {
			params: { name: "  " },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return 401 if user is not authorized", async () => {
		const retrievedGroup = { name: "testGroup", members: ["test1", "test2"] };

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(retrievedGroup);
		await getGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		Group.findOne.mockRejectedValueOnce(new Error("Database error"));

		await getGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("addToGroup", () => {
	test("admin should add users to group", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test3@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test4@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce({
			name: "testGroup",
			members: ["test1@example.com", "test2@example.com", "test3@example.com", "test4@example.com"],
		});

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				group: {
					name: "testGroup",
					members: ["test1@example.com", "test2@example.com", "test3@example.com", "test4@example.com"],
				},
				alreadyInGroup: [],
				membersNotFound: [],
			},
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("member should add users to group", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/add",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test3@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test4@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce({
			name: "testGroup",
			members: ["test1@example.com", "test2@example.com", "test3@example.com", "test4@example.com"],
		});

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				group: {
					name: "testGroup",
					members: ["test1@example.com", "test2@example.com", "test3@example.com", "test4@example.com"],
				},
				alreadyInGroup: [],
				membersNotFound: [],
			},
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: {},
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group members provided" });
	});

	test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockReq = {
			params: {},
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await addToGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return a 400 error if the group name passed as a route parameter does not represent a group in the database", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group doesn't exists" });
	});

	test("should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test3@example.com");
		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup2", members: ["test3@example.com", "test5@example.com"] });
		jest.spyOn(User, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No valid group members provided" });
	});

	test("should return a 400 error if at least one of the member emails is not in a valid email format", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "invalidEmailFormat"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => false);

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email has an invalid format" });
	});

	test("should return a 400 error if at least one of the member emails is an empty string", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", ""] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => true);

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email has an invalid format" });
	});

	test("should return a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/add`", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/add",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/insert`", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest
			.spyOn(Group, "findOne")
			.mockResolvedValueOnce({ name: "testGroup", members: ["test1@example.com", "test2@example.com"] });
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/insert",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		Group.findOne.mockRejectedValueOnce(new Error("Database error"));

		await addToGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("removeFromGroup", () => {
	test("should return a 200 status code if the users are successfully removed from the group", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/remove",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test3@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test4@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		jest.spyOn(Group, "updateOne").mockResolvedValueOnce({ nModified: 1 });
		jest.spyOn(Group, "findOne").mockResolvedValueOnce({
			name: "testGroup",
			members: ["test1@example.com", "test2@example.com"],
		});

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				group: {
					name: "testGroup",
					members: ["test1@example.com", "test2@example.com"],
				},
				notInGroup: [],
				membersNotFound: [],
			},
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return a 200 status code if the users are successfully removed (by admin) from the group", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test3@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test4@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		jest.spyOn(Group, "updateOne").mockResolvedValueOnce({ nModified: 1 });
		jest.spyOn(Group, "findOne").mockResolvedValueOnce({
			name: "testGroup",
			members: ["test1@example.com", "test2@example.com"],
		});

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(User.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: {
				group: {
					name: "testGroup",
					members: ["test1@example.com", "test2@example.com"],
				},
				notInGroup: [],
				membersNotFound: [],
			},
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockReq = {
			params: {},
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: {},
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await removeFromGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group members provided" });
	});

	test("should return a 400 error if the group name passed as a route parameter does not represent a group in the database", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group doesn't exists" });
	});

	test("should return a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [{ email: "test1@example.com" }, { email: "test2@example.com" }, { email: "test5@example.com" }],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		verifyEmail.mockImplementation(() => true);
		jest.spyOn(User, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("test4@example.com");
		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No valid group members provided" });
	});

	test("should return a 400 error if at least one of the emails is not in a valid email format", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "invalidFormatEmail"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyEmail.mockImplementation(() => false);

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email has an invalid format" });
	});

	test("should return a 400 error if at least one of the emails is an empty string", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", ""] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyEmail.mockImplementation(() => false);

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Email has an invalid format" });
	});

	test("should return a 400 error if the group contains only one member before deleting any user", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [{ email: "test1@example.com" }],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Cannot remove last member" });
	});

	test("should return a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/remove`", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/remove",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/pull",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		const mockReq = {
			params: { name: "testGroup" },
			body: { emails: ["test3@example.com", "test4@example.com"] },
			url: "api/groups/testGroup/remove",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		Group.findOne.mockRejectedValueOnce(new Error("Database error"));

		await removeFromGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});

describe("deleteUser", () => {
	test("should delete the user and return the expected response", async () => {
		const mockReq = {
			body: { email: "existing@example.com" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed successfully",
			},
		};

		User.findOne.mockResolvedValue({ email: "existing@example.com", role: "User" });
		Group.find.mockResolvedValueOnce([
			{ _id: "group1", members: [{ email: "existing@example.com" }, { email: "another@example.com" }] },
		]);
		Group.updateOne.mockImplementationOnce(async (query, update) => {
			if (query._id === "group1") {
				const updatedGroup = {
					_id: "group1",
					members: update.$set.members,
				};
				return { nModified: 1, n: 1, updatedGroup };
			}
			throw new Error("Update error");
		});
		transactions.deleteMany.mockResolvedValueOnce({ deletedCount: 3 });

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { deletedTransactions: 3, deletedFromGroup: true },
			refreshedTokenMessage: "Token refreshed successfully",
		});
	});

	test("should return a 400 error if the request body is missing the email field", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the all the fields" });
	});

	test("should return a 400 error if the email field is empty", async () => {
		const mockReq = {
			body: { email: "  " },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the all the fields" });
	});

	test("should return a 400 error if the email field is missing", async () => {
		const mockReq = {
			body: { email: null },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		verifyEmail.mockImplementation(() => false);

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Please provide the all the fields" });
	});

	test("should return a 400 error if the email format is invalid", async () => {
		const mockReq = {
			body: { email: "invalid_email" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		verifyEmail.mockImplementation(() => false);

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid email format" });
	});

	test("should return a 400 error if the user does not exist", async () => {
		const mockReq = {
			body: { email: "nonexistent@example.com" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		verifyEmail.mockImplementation(() => true);
		User.findOne.mockResolvedValueOnce(null);

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User does not exist" });
	});

	test("should return a 401 error if the user making the request is not an admin", async () => {
		const mockReq = {
			body: { email: "existing@example.com" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		User.findOne.mockResolvedValueOnce({ email: "existing@example.com", role: "Regular" });
		verifyEmail.mockImplementation(() => true);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 400 error if attempting to delete an admin user", async () => {
		const mockReq = {
			body: { email: "existing@example.com" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		verifyEmail.mockImplementation(() => true);
		User.findOne.mockResolvedValueOnce({ email: "existing@example.com", role: "Admin" });
		verifyAuth.mockReturnValue({ flag: true, cause: "authorized" });

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Cannot delete an admin user" });
	});

	test("should return a 500 error if an error occurs during deletion", async () => {
		const mockReq = {
			body: { email: "existing@example.com" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		verifyEmail.mockImplementation(() => true);
		User.findOne.mockResolvedValue({ email: "existing@example.com", role: "User" });
		verifyAuth.mockReturnValue({ flag: true, cause: "Not authorized" });
		User.findOne.mockRejectedValue(new Error("Database error"));

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});

	test("should delete the group if no members remain", async () => {
		const mockReq = {
			body: { email: "existing@example.com" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed successfully",
			},
		};

		User.findOne.mockResolvedValueOnce({ email: "existing@example.com", role: "User" });
		Group.find.mockResolvedValueOnce([{ _id: "group1", members: [{ email: "existing@example.com" }] }]);
		Group.updateOne.mockImplementationOnce(async (query, update) => {
			if (query._id === "group1") {
				const updatedGroup = {
					_id: "group1",
					members: update.$set.members,
				};
				return { nModified: 1, n: 1, updatedGroup };
			}
			throw new Error("Update error");
		});
		transactions.deleteMany.mockResolvedValueOnce({ deletedCount: 3 });
		Group.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

		verifyEmail.mockImplementation(() => true);
		User.findOne.mockResolvedValueOnce({ email: "existing@example.com", role: "User" });
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { deletedTransactions: 3, deletedFromGroup: true },
			refreshedTokenMessage: "Token refreshed successfully",
		});
	});
});

describe("deleteGroup", () => {
	test("should return a 200 status code and a message confirming successful deletion if the group is deleted successfully", async () => {
		const mockReq = {
			body: { name: "testGroup" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: "Group deleted" },
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return a 400 error if the name passed in the request body is an empty string", async () => {
		const mockReq = {
			body: { name: "" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		await deleteGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "No group name provided" });
	});

	test("should return a 400 error if the name passed in the request body does not represent a group in the database", async () => {
		const mockReq = {
			body: { name: "testGroup" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await deleteGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group doesn't exists" });
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		const mockReq = {
			body: { name: "testGroup" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		const mockGroup = {
			name: "testGroup",
			members: [
				{ email: "test1@example.com" },
				{ email: "test2@example.com" },
				{ email: "test3@example.com" },
				{ email: "test4@example.com" },
			],
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await deleteGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		const mockReq = {
			body: { name: "testGroup" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: { refreshedTokenMessage: "Token refreshed" },
		};

		Group.findOne.mockRejectedValueOnce(new Error("Database error"));

		await deleteGroup(mockReq, mockRes);

		expect(Group.findOne).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith("Database error");
	});
});
