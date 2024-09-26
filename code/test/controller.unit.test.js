import { categories, transactions } from "../models/model";
import {
	updateCategory,
	createCategory,
	getAllTransactions,
	deleteCategory,
	getCategories,
	getTransactionsByUser,
	deleteTransaction,
	getTransactionsByUserByCategory,
	getTransactionsByGroupByCategory,
	getTransactionsByGroup,
	deleteTransactions,
	createTransaction,
} from "../controllers/controller";
import { handleAmountFilterParams, handleDateFilterParams, verifyAuth } from "../controllers/utils";
import { User, Group } from "../models/User";

jest.mock("../models/model.js");
jest.mock("../models/User.js");
jest.mock("../controllers/utils.js");

beforeEach(() => {
	categories.find.mockClear();
	categories.findOne.mockClear();
	categories.prototype.save.mockClear();
	transactions.find.mockClear();
	transactions.deleteOne.mockClear();
	transactions.aggregate.mockClear();
	transactions.prototype.save.mockClear();
	verifyAuth.mockClear();
});

afterEach(() => {
	jest.clearAllMocks();
});

describe("createCategory", () => {
	test("should return 401 if user is not admin", async () => {
		const mockReq = {
			body: { type: "example", color: "red" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return 400 if type or color is missing", async () => {
		const mockReq = {
			body: { color: "red" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("should return 400 if type or color is empty", async () => {
		const mockReq = {
			body: { type: "example", color: "   " },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("should return 400 if category with the same type already exists", async () => {
		const mockReq = { body: { type: "example", color: "red" } };
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockImplementation(() => ({ type: "example", color: "white" }));

		await createCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Category already exists" });
	});

	test("should save the new category and return the data", async () => {
		const mockReq = { body: { type: "example", color: "red" } };
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Refreshed token message",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockImplementation(() => null);
		jest.spyOn(categories, "create").mockReturnValue({
			save: jest.fn().mockResolvedValue({ type: "example", color: "red" }),
		});

		await createCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { type: "example", color: "red" },
			refreshedTokenMessage: "Refreshed token message",
		});
	});

	test("should return 500 if an exception occurs", async () => {
		const mockReq = { body: { type: "example", color: "red" } };
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		categories.findOne.mockRejectedValueOnce(new Error("Database error"));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("updateCategory", () => {
	test("should return 401 if user is not admin", async () => {
		const mockReq = {
			body: { type: "example", color: "red" },
			params: { type: "example" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return 400 if category to be updated is not in the system", async () => {
		const mockReq = {
			body: { type: "example", color: "red" },
			params: { type: "example" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockImplementation(() => null);

		await updateCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Category not found" });
	});

	test("should return 400 if type or color is missing", async () => {
		const mockReq = {
			body: { type: "example" },
			params: { type: "example" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockImplementation(() => ({ type: "example", color: "red" }));

		await updateCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid parameters" });
	});

	test("should return 400 if type or color is empty", async () => {
		const mockReq = {
			body: { type: "example", color: "  " },
			params: { type: "example" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockImplementation(() => ({ type: "example", color: "red" }));

		await updateCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("should return 400 if category already exists", async () => {
		const mockReq = {
			body: { type: "example", color: "white" },
			params: { type: "exampleV2" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockImplementation(() => ({ type: "example", color: "red" }));

		await updateCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "exampleV2" });
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Category already exists" });
	});

	test("should update specified category and return a confirmation message and count of updated transaction", async () => {
		const mockReq = {
			body: { type: "example", color: "white" },
			params: { type: "exampleV2" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest
			.spyOn(categories, "findOne")
			.mockImplementationOnce(() => ({ type: "example", color: "red" }, { save: jest.fn().mockResolvedValue() }));
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => null);
		jest.spyOn(transactions, "countDocuments").mockImplementation(() => 4);

		await updateCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "exampleV2" });
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: "Category edited successfully", count: 4 },
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return 500 if an exception occurs", async () => {
		const mockReq = {
			body: { type: "example", color: "white" },
			params: { type: "exampleV2" },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		categories.findOne.mockRejectedValueOnce(new Error("Database error"));

		await updateCategory(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "exampleV2" });
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("deleteCategory", () => {
	test("should return 401 if user is not admin", async () => {
		const mockReq = {
			body: { types: ["example", "example2"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return 400 if types is missing", async () => {
		const mockReq = {
			body: { ty: ["example", "example2"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("should return 400 if types is empty", async () => {
		const mockReq = {
			body: { types: [] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("should return 400 if there is only one category saved", async () => {
		const mockReq = {
			body: { types: ["example", "example2"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockCategories = [{ type: "example", color: "red" }];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => mockCategories);

		await deleteCategory(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "There is only one category saved" });
	});

	test("should return 400 if one type in the array is empty", async () => {
		const mockReq = {
			body: { types: ["   ", "example"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockCategories = [
			{ type: "example", color: "red" },
			{ type: "example2", color: "black" },
			{ type: "example3", color: "white" },
		];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => mockCategories);

		await deleteCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty type" });
	});

	test("should return 400 if one category not exists", async () => {
		const mockReq = {
			body: { types: ["example4", "example2"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockCategories = [
			{ type: "example", color: "red" },
			{ type: "example2", color: "black" },
			{ type: "example3", color: "white" },
		];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => mockCategories);
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => null);

		await deleteCategory(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example4" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Category not found" });
	});

	test("should delete specified categories and return a confirmation message and count of updated transaction", async () => {
		const mockReq = {
			body: { types: ["example", "example2"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockCategories = [
			{ type: "example", color: "red" },
			{ type: "example2", color: "black" },
			{ type: "example3", color: "white" },
		];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => mockCategories);
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => mockCategories[0]);
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => mockCategories[1]);
		jest.spyOn(transactions, "countDocuments").mockImplementationOnce(() => 2);
		jest.spyOn(transactions, "countDocuments").mockImplementationOnce(() => 4);

		await deleteCategory(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example2" });
		expect(transactions.countDocuments).toHaveBeenCalledWith({ type: "example" });
		expect(transactions.countDocuments).toHaveBeenCalledWith({ type: "example2" });
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: "Category deleted successfully", count: 6 },
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should delete specified categories and return a confirmation message and count of updated transaction (special case: types includes all category saved)", async () => {
		const mockReq = {
			body: { types: ["example", "example2", "example3"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockCategories = [
			{ type: "example", color: "red" },
			{ type: "example2", color: "black" },
			{ type: "example3", color: "white" },
		];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => mockCategories);
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => mockCategories[0]);
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => mockCategories[1]);
		jest.spyOn(categories, "findOne").mockImplementationOnce(() => mockCategories[2]);
		jest.spyOn(transactions, "countDocuments").mockImplementationOnce(() => 4);
		jest.spyOn(transactions, "countDocuments").mockImplementationOnce(() => 3);

		await deleteCategory(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example" });
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example2" });
		expect(categories.findOne).toHaveBeenCalledWith({ type: "example3" });
		expect(transactions.countDocuments).toHaveBeenCalledWith({ type: "example2" });
		expect(transactions.countDocuments).toHaveBeenCalledWith({ type: "example3" });
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: "Category deleted successfully", count: 7 },
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return 500 if an exception occurs", async () => {
		const mockReq = {
			body: { types: ["example", "example2", "example3"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		categories.find.mockRejectedValueOnce(new Error("Database error"));

		await deleteCategory(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("getCategories", () => {
	test("should return 401 if user is not authenticated", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return all categories saved", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockCategories = [
			{ type: "example", color: "red" },
			{ type: "example2", color: "black" },
			{ type: "example3", color: "white" },
		];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => mockCategories);

		await getCategories(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: mockCategories,
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return 200 and an empty array if no categories are saved", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "find").mockImplementation(() => []);

		await getCategories(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return 500 if an exception occurs", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		categories.find.mockRejectedValueOnce(new Error("Database error"));

		await getCategories(mockReq, mockRes);

		expect(categories.find).toHaveBeenCalledWith({});
		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("createTransaction", () => {
	test("should create a new transaction", async () => {
		const mockReq = {
			body: {
				username: "Mario",
				type: "food",
				amount: 100,
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const createdTransaction = {
			username: "Mario",
			type: "food",
			amount: 100,
			date: "2023-05-19T00:00:00",
		};

		jest.spyOn(User, "findOne").mockResolvedValue({ username: "Mario" });
		jest.spyOn(categories, "findOne").mockResolvedValue({ type: "food" });
		jest.spyOn(transactions, "create").mockResolvedValue(createdTransaction);

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: createdTransaction,
			refreshedTokenMessage: mockRes.locals.refreshedTokenMessage,
		});
	});

	test("should return a 401 error if the user is not authenticated", async () => {
		const mockReq = {
			body: {
				username: "Mario",
				type: "food",
				amount: 100,
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const createdTransaction = {
			username: "Mario",
			type: "food",
			amount: 100,
			date: "2023-05-19T00:00:00",
		};

		jest.spyOn(User, "findOne").mockResolvedValue({ username: "Mario" });
		jest.spyOn(categories, "findOne").mockResolvedValue({ type: "food" });
		jest.spyOn(transactions, "create").mockResolvedValue(createdTransaction);

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 400 error if at least one of the parameters in the request body is missing", async () => {
		const mockReq = {
			body: {
				username: "",
				type: "food",
				amount: 100,
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("should return a 400 error if at least one of the parameters in the request body is an empty string", async () => {
		const mockReq = {
			body: {
				username: "  ",
				type: "food",
				amount: 100,
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("should return a 400 error if amount parameters in the request body is an empty string", async () => {
		const mockReq = {
			body: {
				username: "test",
				type: "food",
				amount: "   ",
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("should return a 400 error if username in body and url is not the same", async () => {
		const mockReq = {
			body: {
				username: "test",
				type: "food",
				amount: 100,
			},
			params: {
				username: "otherName",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Username in body and in url must be the same" });
	});

	test("should return a 400 error if selected user does not exist in the database", async () => {
		const mockReq = {
			body: {
				username: "test",
				type: "food",
				amount: 100,
			},
			params: {
				username: "test",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValueOnce(null);

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User does not exist" });
	});

	test("should return a 400 error if amount parameter type is not a string or a number", async () => {
		const mockReq = {
			body: {
				username: "test",
				type: "food",
				amount: { invalidFormat: "invalid" },
			},
			params: {
				username: "test",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValueOnce({ username: "Mario" });
		jest.spyOn(categories, "findOne").mockResolvedValueOnce({ type: "food" });

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Amount must be a number or a string" });
	});

	test("should return a 400 error if the type of category passed in the request body does not represent a category in the database", async () => {
		const mockReq = {
			body: {
				username: "Mario",
				type: "nonexistent",
				amount: 100,
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		categories.findOne.mockResolvedValueOnce(null);

		await createTransaction(mockReq, mockRes);

		expect(categories.findOne).toHaveBeenCalledWith({ type: "nonexistent" });
		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Category does not exist" });
	});

	test("should return a 400 error if the amount passed in the request body cannot be parsed as a floating value", async () => {
		const mockReq = {
			body: {
				username: "Mario",
				type: "food",
				amount: "invalid",
			},
			params: {
				username: "Mario",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		User.findOne.mockResolvedValueOnce({ username: "Mario" });
		categories.findOne.mockResolvedValueOnce({ type: "food" });

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Amount must be a valid numeric string" });
	});

	test("Returns a 500 error if transaction creation fails", async () => {
		const mockReq = {
			body: {
				username: "testUser",
				type: "expense",
				amount: 100,
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(categories, "findOne").mockRejectedValueOnce(new Error("Database error"));

		await createTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("getAllTransactions", () => {
	test("Should get the list of all Transactions", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockTransactionData = [
			{
				_id: "123456",
				username: "testUser",
				amount: 100,
				type: "example",
				color: "blue",
				date: new Date(),
			},
			{
				_id: "123457",
				username: "testUser",
				amount: 200,
				type: "example",
				color: "yellow",
				date: new Date(),
			},
			{
				_id: "123458",
				username: "testUser",
				amount: 300,
				type: "example",
				color: "red",
				date: new Date(),
			},
		];

		// Mock the verifyAuth function
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		// Mock the transactions.aggregate method
		jest.spyOn(transactions, "aggregate").mockResolvedValue(mockTransactionData);

		// Act
		await getAllTransactions(mockReq, mockRes);

		// Assert
		expect(transactions.aggregate).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: mockTransactionData, refreshedTokenMessage: "Token refreshed" });
	});

	test("Returns empty array if there are no transactions", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(transactions, "aggregate").mockResolvedValue([]);

		await getAllTransactions(mockReq, mockRes);

		expect(transactions.aggregate).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: "Token refreshed" });
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 500 error if an exception occurs", async () => {
		const mockReq = {};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		transactions.aggregate.mockRejectedValueOnce(new Error("Database error"));

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("getTransactionsByUser", () => {
	test("Should return transactions for a specified user", async () => {
		const mockUser = {
			username: "testUser",
		};
		const mockReq = {
			params: {
				username: "testUser",
			},
			url: "api/users/testUser/transactions", //user endpoint
			query: {
				min: "",
				max: "",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const filteredTx = [
			{
				username: "testUser",
				type: "example",
				amount: 200,
				date: "2023-01-05",
				color: "blue",
			},
		];

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(filteredTx);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: filteredTx,
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return an empty array (admin endpoint)", async () => {
		const mockUser = {
			username: "testUser",
		};
		const mockReq = {
			params: {
				username: "testUser",
			},
			url: "api/transactions/users/testUser/", //user endpoint
			query: {
				min: "",
				max: "",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue([]);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("Should return transactions for a specified user", async () => {
		const mockUser = {
			username: "testUser",
		};
		const mockReq = {
			params: {
				username: "testUser",
			},
			url: "api/transactions/users/testUser", //admin endpoint
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const filteredTx = [
			{
				username: "testUser",
				type: "example",
				amount: 200,
				date: "2023-01-05",
				color: "blue",
			},
		];

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(filteredTx);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: filteredTx,
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("error 400 is returned if the user does not exist", async () => {
		const mockReq = {
			params: {
				username: "nonExistentUser",
			},
			url: "api/users/nonExistentUser/transactions", //user endpoint
			query: {
				min: "",
				max: "",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(User, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User does not exist" });
	});

	test("empty array is returned if there are no transactions made by the user", async () => {
		const mockUser = {
			username: "nonExistentUser",
		};
		const mockReq = {
			params: {
				username: "nonExistentUser",
			},
			url: "api/users/nonExistentUser/transactions", //user endpoint
			query: {
				min: "",
				max: "",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue([]);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: "Token refreshed" });
	});

	test("if there are query parameters and the function has been called by a Regular user then the returned transactions must be filtered according to the query parameters", async () => {
		const mockUser = {
			username: "testUser",
		};
		const mockReq = {
			params: {
				username: "testUser",
			},
			url: "api/users/testUser/transactions", //user endpoint
			query: {
				min: "20",
				max: "150",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const filteredTx = [
			{
				username: "testUser",
				type: "example",
				amount: 100,
				date: "2023-01-05",
				color: "blue",
			},
		];

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $gte: parseFloat(20) } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(filteredTx);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: filteredTx,
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions`", async () => {
		const mockUser = {
			username: "otherUser",
		};
		const mockReq = {
			params: {
				username: "testUser",
			},
			url: `api/users/testUser/transactions`, //user endpoint
			query: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`", async () => {
		const mockUser = {
			username: "notAdmin",
		};
		const mockReq = {
			params: {
				username: "notAdmin",
			},
			url: `api/transactions/users/notAdmin`, //user endpoint
			query: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("Should return a 500 error code on server error", async () => {
		const mockReq = {
			params: {
				username: "testUser",
			},
			url: "api/users/testUser/transactions",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockRejectedValue(new Error("Database connection failed"));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database connection failed" });
	});

	test("Should return error 400 if parameters are missing", async () => {
		const mockReq = {
			params: {},
			url: `api/transactions/users/notAdmin`, //user endpoint
			query: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("Should return error 400 if parameters are empty string", async () => {
		const mockReq = {
			params: {
				username: "  ",
			},
			url: `api/transactions/users/`, //user endpoint
			query: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		handleAmountFilterParams.mockImplementation(() => ({ amount: { $exists: true } }));
		handleDateFilterParams.mockImplementation(() => ({ date: { $exists: true } }));
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUser(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});
});

describe("getTransactionsByUserByCategory", () => {
	test("Should Return all transactions made by a specific user filtered by a specific category", async () => {
		const mockReq = {
			params: {
				username: "testUser",
				category: "food",
			},
			url: "api/users/testUser/transactions/category/food",
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const filteredTx = [
			{ username: "testUser", type: "food", amount: 100, date: "2023-01-03" },
			{ username: "testUser", type: "food", amount: 200, date: "2023-02-03" },
		];
		const mockUser = { username: "testUser" };
		const mockCategory = { type: "food", color: "blue" };

		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(filteredTx);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: filteredTx, refreshedTokenMessage: "Token refreshed" });
	});

	test("Returns a 400 error if the username passed as a route parameter does not represent a user in the database", async () => {
		//mocking user and category

		const mockCategory = { type: "food", color: "blue" };
		const mockReq = {
			params: {
				username: "nonExistentUser",
				category: "food",
			},
			url: "api/users/nonExistentUser/transactions/category/food",
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(null);

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User does not exist" });
	});

	test("Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions/category/:category`", async () => {
		// Mocking user and category
		const mockCategory = { type: "food", color: "blue" };
		const mockUser = { username: "otherUser" };

		const mockReq = {
			params: {
				username: "otherUser",
				category: "food",
			},
			url: "api/users/otherUser/transactions/category/food",
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("Returns a 400 error if the username passed as a route parameter does not represent a category in the database", async () => {
		//mocking user and category
		const mockUser = { username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
				category: "nonExistentCategory",
			},
			url: "api/users/testUser/transactions/category/nonExistentCategory",
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(categories, "findOne").mockResolvedValue(null);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Category does not exist",
		});
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username/category/:category`", async () => {
		// Mocking user and category
		const mockCategory = { type: "food", color: "blue" };
		const mockUser = { username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
				category: "nonExistentCategory",
			},
			url: "api/transactions/users/testUser/category/food",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return an empty array if no transactions found", async () => {
		// Mocking authenticated user and group
		const mockCategory = { type: "food", color: "blue" };
		const mockUser = { username: "testUser" };

		const mockReq = {
			params: {
				username: "testUser",
				category: "food",
			},
			url: `/api/transactions/users/testUser/category/food`,
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockImplementation(() => {
			return [];
		});

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: "Token refreshed" });
	});

	test("should return error 400 with missing parameters", async () => {
		const mockCategory = { type: " ", color: "blue" };
		const mockUser = { username: " " };

		const mockReq = {
			params: {},
			url: `/api/transactions/users/category/`,
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockImplementation(() => {
			return [];
		});

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Missing parameters",
		});
	});

	test("should return error 400 with empty parameters", async () => {
		const mockCategory = { type: " ", color: "blue" };
		const mockUser = { username: " " };

		const mockReq = {
			params: {
				username: " ",
				category: " ",
			},
			url: `/api/transactions/users/category/`,
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(transactions, "aggregate").mockImplementation(() => {
			return [];
		});

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Empty parameters",
		});
	});

	test("should return a 500 error if an exception occurs", async () => {
		const mockReq = {
			params: {
				username: "testUser",
				category: "food",
			},
			url: "api/users/testUser/transactions/category/food",
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		User.findOne.mockRejectedValueOnce(new Error("Database error"));

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByUserByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("getTransactionsByGroup", () => {
	test("should return transactions grouped by category", async () => {
		// Mocking authenticated user and group
		const mockGroup = {
			name: "Family",
			members: ["user1@example.com", "user2@example.com"],
		};
		const mockReq = {
			params: {
				name: "Family",
			},
			url: `/api/groups/Family/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		const filteredTx = [
			{ username: "user1", type: "category1", amount: 10, date: new Date(), color: "blue" },
			{ username: "user1", type: "category2", amount: 20, date: new Date(), color: "red" },
			{ username: "user2", type: "category1", amount: 30, date: new Date(), color: "blue" },
			{ username: "user2", type: "category2", amount: 40, date: new Date(), color: "red" },
		];

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		jest.spyOn(transactions, "aggregate").mockResolvedValueOnce(filteredTx);
		jest.spyOn(User, "findOne").mockResolvedValueOnce("user1@example.com");
		jest.spyOn(User, "findOne").mockResolvedValueOnce("user1@example.com");
		jest.spyOn(User, "findOne").mockResolvedValueOnce("user2@example.com");
		jest.spyOn(User, "findOne").mockResolvedValueOnce("user2@example.com");
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: filteredTx,
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("should return an empty array if no transactions found", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
			},
			url: `/api/groups/Family/transactions`,
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(transactions, "aggregate").mockImplementation(() => {
			return [];
		});

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: expect.any(String),
		});
	});

	test("should return a 400 error if the group does not exist", async () => {
		// Mocking authenticated user
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: [],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "NonexistentGroup",
			},
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(null);

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group doesn't exists" });
	});

	test("should return a 401 error if called by an authenticated user who is not part of the group (authType = Group)", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user2"],
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
			},
			url: `api/groups/Family/transactions`,
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: [],
			authType: "Admin",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user2"],
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
			},
			url: `api/transactions/groups/Family`,
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(Group, "findOne").mockResolvedValueOnce(mockGroup);
		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
	});

	test("Missing parameters", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: [],
			authType: "Admin",
		};
		const mockReq = {
			user: mockUser,
			params: {},
			url: `/api/transactions/groups/Family`,
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("Empty string parameters", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: [],
			authType: "Admin",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: " ",
			},
			url: `/api/transactions/groups/Family`,
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("500 error for getTransactionsByGroup", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: [],
			authType: "Admin",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
			},
			url: `/api/transactions/groups/Family`,
			query: {
				startDate: "2023-01-01",
				endDate: "2023-01-31",
			},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		// Mock the implementation of the Group.findOne function to throw an error
		Group.findOne = jest.fn(() => {
			throw new Error("Database error");
		});

		await getTransactionsByGroup(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});

describe("getTransactionsByGroupByCategory", () => {
	test("should Return all transactions made by members of a specific group filtered by a specific category", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user1", "user2"],
		};
		const mockCategory = { type: "food", color: "blue" };
		const filteredTx = [
			{
				username: "John",
				type: "food",
				amount: 200,
				date: "2023-01-02",
				color: "blue",
			},
		];
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "food",
			},
			url: `api/groups/Family/transactions/category/food`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(User, "findOne").mockResolvedValue({ username: "John" });
		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(Group, "findOne").mockResolvedValue(mockGroup);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(filteredTx);

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: filteredTx, refreshedTokenMessage: "Token refreshed" });
	});

	test("Returns a 400 error if the group name passed as a route parameter does not represent a group in the database", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockCategory = { type: "food", color: "blue" };
		const mockReq = {
			user: mockUser,
			params: {
				name: "nonexistent",
				category: "food",
			},
			url: `api/groups/nonexistent/transactions/category/food`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(User, "findOne").mockResolvedValue({ username: "John" });
		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(Group, "findOne").mockResolvedValue(null);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Group doesn't exists" });
	});

	test("Returns a 400 error if the category name passed as a route parameter does not represent a category in the database", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user1", "user2"],
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "nonexistent",
			},
			url: `api/groups/Family/transactions/category/nonexistent`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(User, "findOne").mockResolvedValue({ username: "John" });
		jest.spyOn(categories, "findOne").mockResolvedValue(null);
		jest.spyOn(Group, "findOne").mockResolvedValue(mockGroup);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Category doesn't exists" });
	});

	test("Returns a 400 error if the category name passed as a route parameter is missing", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
			},
			url: `api/groups/Family/transactions/category/nonexistent`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("Returns a 400 error if the group name passed as a route parameter is missing", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				category: "nonexistent",
			},
			url: `api/groups/Family/transactions/category/nonexistent`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("Returns a 400 error if the category name passed as a route parameter is empty", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "   ",
			},
			url: `api/groups/Family/transactions/category/nonexistent`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("Returns a 400 error if the group name passed as a route parameter is empty", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "   ",
				category: "nonexistent",
			},
			url: `api/groups/Family/transactions/category/nonexistent`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty parameters" });
	});

	test("should return a 401 error if called by an authenticated user who is not part of the group (authType = Group)", async () => {
		const mockUser = {
			username: "user1",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user2"],
		};
		const mockCategory = {
			type: "food",
			color: "blue",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "food",
			},
			url: `api/groups/Family/transactions/category/food`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(Group, "findOne").mockResolvedValue(mockGroup);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalled();
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/groups/:name/category/:category`", async () => {
		// Mocking authenticated user and group
		const mockUser = {
			username: "user1",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user2"],
		};
		const mockCategory = {
			type: "food",
			color: "blue",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "food",
			},
			url: `api/transactions/groups/Family/category/food`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(Group, "findOne").mockResolvedValue(mockGroup);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockResolvedValue(null);

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalled();
	});

	test("empty array must be returned if there are no transactions made by the group with the specified category", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockGroup = {
			_id: "group1",
			name: "Family",
			admin: "user2",
			members: ["user2"],
		};
		const mockCategory = {
			type: "food",
			color: "blue",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "food",
			},
			url: `api/groups/Family/transactions/category/food`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(categories, "findOne").mockResolvedValue(mockCategory);
		jest.spyOn(Group, "findOne").mockResolvedValue(mockGroup);
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "aggregate").mockImplementation(() => {
			return [];
		});

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: expect.any(String) });
	});

	test("Returns a 500 error if an error occurs during processing", async () => {
		const mockUser = {
			_id: "user1",
			username: "John",
			groups: ["Family"],
			authType: "Group",
		};
		const mockReq = {
			user: mockUser,
			params: {
				name: "Family",
				category: "food",
			},
			url: `api/groups/Family/transactions/category/food`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(Group, "findOne").mockImplementation(() => {
			throw new Error("Internal Server Error");
		});

		await getTransactionsByGroupByCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
	});
});

describe("deleteTransaction", () => {
	test("Delete a transaction made by a specific user", async () => {
		const mockUser = { username: "testUser" };
		const mockTx = { _id: "6hjkohgfc8nvu786", username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
			},
			body: { _id: "6hjkohgfc8nvu786" },
			url: `/api/users/testUser/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "findOne").mockResolvedValue(mockTx);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(transactions, "deleteOne").mockResolvedValue();

		await deleteTransaction(mockReq, mockRes);

		expect(transactions.deleteOne).toHaveBeenCalledWith({ _id: mockTx._id });
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: "Transaction deleted" },
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("Returns a 400 error if the request body does not contain all the necessary attributes", async () => {
		const mockUser = { username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
			},
			body: {},
			url: `/api/users/testUser/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(transactions, "deleteOne").mockResolvedValue();

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalled();
	});

	test("Returns a 400 error if the `_id` in the request body is an empty string", async () => {
		const mockUser = { username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
			},
			body: { _id: "" },
			url: `/api/users/testUser/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("Returns a 400 error if the username passed as a route parameter does not represent a user in the database", async () => {
		const mockReq = {
			params: {
				username: "nonExistentUser",
			},
			body: { _id: "lhcsdchoch3242" },
			url: `/api/users/nonExistentUser/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User does not exist" });
	});

	test("Returns a 400 error if the transaction id passed as a route parameter does not represent a user in the database", async () => {
		const mockUser = { username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
			},
			body: { _id: "nonExistentId" },
			url: `/api/users/testUser/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "findOne").mockResolvedValue(null);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Transaction does not exist" });
	});

	test(" Returns a 400 error if the `_id` in the request body represents a transaction made by a different user than the one in the route", async () => {
		const mockUser = { username: "testUser" };
		const mockReq = {
			params: {
				username: "testUser",
			},
			body: { _id: "fwefhofewo" },
			url: `/api/users/testUser/transactions`,
		};
		const mockTx = {
			_id: "fwefhofewo",
			username: "otherUser",
			type: "example",
			amount: 100,
			date: "2023-01-01",
			color: "blue",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);
		jest.spyOn(transactions, "findOne").mockResolvedValue(mockTx);
		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "User mismatch" });
	});

	test("Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User)", async () => {
		const mockUser = { username: "authenticatedUser" };
		const mockReq = {
			params: { username: "differentUser" },
			url: `/api/users/testUser/transactions`,
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));
		jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalled();
	});

	test("Returns a 500 error if an error occurs during processing", async () => {
		const mockReq = {
			params: { username: "testUser" },
			url: "/api/users/testUser/transactions",
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		jest.spyOn(User, "findOne").mockImplementation(() => {
			throw new Error("Internal Server Error");
		});

		await deleteTransaction(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
	});
});

describe("deleteTransactions", () => {
	test("Delete multiple transactions identified by their ids", async () => {
		const mockReq = {
			body: { _ids: ["6hjkohgfc8nvu786"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockTxId = ["6hjkohgfc8nvu786", "bdvkbfi"];

		verifyAuth.mockImplementation(() => ({ flag: true, cause: "Authorized" }));
		jest.spyOn(transactions, "find").mockResolvedValue(mockTxId);
		jest.spyOn(transactions, "deleteMany").mockResolvedValue();

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: { message: "Transactions deleted" },
			refreshedTokenMessage: "Token refreshed",
		});
	});

	test("error 400 is returned if at least one of the `_ids` does not have a corresponding transaction. Transactions that have an id are not deleted in this case", async () => {
		const mockReq = {
			body: { _ids: ["nonExistentId", "6hjkohgfc8nvu786"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};
		const mockTxId = ["6hjkohgfc8nvu786"];

		jest.spyOn(transactions, "find").mockResolvedValue(mockTxId);

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "At least one of the ids does not have a corresponding transaction",
		});
	});

	test("Returns a 400 error if the request body does not contain all the necessary attributes   ", async () => {
		const mockReq = {
			body: {},
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing parameters" });
	});

	test("Returns a 400 error if at least one of the ids in the array is an empty string", async () => {
		const mockReq = {
			body: { _ids: ["nonExistentId", ""] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Empty string in _ids" });
	});

	test("Returns a 400 error if at least one of the ids in the array does not represent a transaction in the database", async () => {
		const mockReq = {
			body: { _ids: ["notValidId"] },
		};

		const mockUser = { username: "testUser" };
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		jest.spyOn(transactions, "findOne").mockResolvedValueOnce(null);
		jest.spyOn(transactions, "deleteMany").mockResolvedValue();

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "transaction _id is not valid" });
	});

	test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
		const mockReq = {
			body: { _ids: ["rgebtbbtrtg"] },
		};
		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			locals: {
				refreshedTokenMessage: "Token refreshed",
			},
		};

		verifyAuth.mockImplementation(() => ({ flag: false, cause: "Unauthorized" }));

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalled();
	});

	test("Should return a 500 error if an error occurs during deletion", async () => {
		const mockAdminAuth = { flag: true };
		const mockReq = {
			body: { _ids: "transactionId" },
		};

		const mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		verifyAuth.mockReturnValueOnce(mockAdminAuth);
		transactions.find.mockRejectedValueOnce(new Error("Database error"));

		await deleteTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
	});
});
