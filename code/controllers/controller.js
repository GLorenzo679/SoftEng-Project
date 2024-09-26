import { categories, transactions } from "../models/model.js";
import { Group, User } from "../models/User.js";
import { handleDateFilterParams, handleAmountFilterParams, verifyAuth } from "./utils.js";

/**
 * Create a new category
  - Request Body Content: An object having attributes `type` and `color`
  - Response `data` Content: An object having attributes `type` and `color`
 */
export const createCategory = async (req, res) => {
	try {
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) {
			return res.status(401).json({ error: adminAuth.cause });
		}
		if (!req.body.type || !req.body.color) {
			return res.status(400).json({ error: "Missing parameters" }); // missing parameters
		}
		const type = req.body.type.trim();
		const color = req.body.color.trim();
		if (type.length === 0 || color.length === 0) {
			return res.status(400).json({ error: "Empty parameters" }); // empty parameters
		}
		let cat = await categories.findOne({ type: type });
		if (cat !== null) {
			return res.status(400).json({ error: "Category already exists" }); // already exists
		}
		const new_categories = await categories.create({ type, color });
		new_categories
			.save()
			.then((data) =>
				res.status(200).json({
					data: { type: data.type, color: data.color },
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				})
			)
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Edit a category's type or color
  - Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Optional behavior:
    - error 400 returned if the specified category does not exist
    - error 400 is returned if new parameters have invalid values
 */
export const updateCategory = async (req, res) => {
	try {
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) {
			return res.status(401).json({ error: adminAuth.cause });
		}
		let cat = await categories.findOne({ type: req.params.type });
		if (cat === null) {
			return res.status(400).json({ error: "Category not found" }); // not found
		}
		if (!req.body.type || !req.body.color) {
			return res.status(400).json({ error: "Invalid parameters" }); // missing parameters
		}
		const type = req.body.type.trim();
		const color = req.body.color.trim();
		if (type.length === 0 || color.length === 0) {
			return res.status(400).json({ error: "Empty parameters" }); // empty parameters
		}
		let cat2 = await categories.findOne({ type: type });
		if (cat2 !== null) {
			return res.status(400).json({ error: "Category already exists" }); // already exists
		}
		let count = await transactions.countDocuments({ type: req.params.type });
		transactions.updateMany({ type: req.params.type }, { type: type });

		cat.type = type;
		cat.color = color;
		cat
			.save()
			.then((data) =>
				res.status(200).json({
					data: { message: "Category edited successfully", count: count },
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				})
			)
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Delete a category
  - Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Response `data` Content: An object with parameter `message` that confirms successful deletion and a parameter `count` that is equal to the count of affected transactions (deleting a category sets all transactions with that category to the first category as their new category)
  - Optional behavior:
    - error 400 is returned if the specified category does not exist
 */
export const deleteCategory = async (req, res) => {
	try {
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) {
			return res.status(401).json({ error: adminAuth.cause });
		}
		if (!req.body.types) {
			return res.status(400).json({ error: "Missing parameters" }); // missing parameters
		}
		if (req.body.types.length === 0) {
			return res.status(400).json({ error: "Empty parameters" }); // empty parameters
		}
		let data = await categories.find({});
		if (data.length === 1) {
			return res.status(400).json({ error: "There is only one category saved" }); // not found
		}
		let types = req.body.types;
		data.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
		let first = data[0].type;
		let found = false;
		for (const i in data) {
			for (const t in types) {
				if (data[i].type === types[t]) {
					found = true;
				}
			}
			if (!found) {
				first = data[i].type;
				break;
			}
			found = false;
		}
		let count = 0;
		for (const i in types) {
			if (types[i].trim().length === 0) {
				return res.status(400).json({ error: "Empty type" }); // empty parameters
			}
			let cat = await categories.findOne({ type: types[i] });
			if (cat === null) {
				return res.status(400).json({ error: "Category not found" }); // not found
			}
			if (types.length !== data.length || cat.type !== first) {
				count += await transactions.countDocuments({ type: types[i] });
			}
		}
		for (const i in types) {
			await transactions.updateMany({ type: types[i] }, { type: first });
		}

		for (const i in types) {
			if (types.length !== data.length || types[i] !== first) {
				await categories.deleteOne({ type: types[i] });
			}
		}
		return res.status(200).json({
			data: { message: "Category deleted successfully", count: count },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Return all the categories
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Optional behavior:
    - empty array is returned if there are no categories
 */
export const getCategories = async (req, res) => {
	try {
		const simpleAuth = verifyAuth(req, res, { authType: "Simple" });
		if (!simpleAuth.flag) {
			return res.status(401).json({ error: simpleAuth.cause });
		}
		let data = await categories.find({});

		let filter = data.map((v) => Object.assign({}, { type: v.type, color: v.color }));
		if (filter.length === 0) {
			return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage });
		}
		return res.status(200).json({ data: filter, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Create a new transaction made by a specific user
  - Request Body Content: An object having attributes `username`, `type` and `amount`
  - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Optional behavior:
    - error 400 is returned if the username or the type of category does not exist
 */
export const createTransaction = async (req, res) => {
	try {
		const username = req.body.username;
		const type = req.body.type;
		let amount = req.body.amount;

		if (!username || !type || !amount) return res.status(400).json({ error: "Missing parameters" });
		if (username.trim().length == 0 || type.trim().length == 0)
			return res.status(400).json({ error: "Empty parameters" });
		if (typeof amount == "string") {
			if (amount.trim() == "") return res.status(400).json({ error: "Empty parameters" });
		}

		const category = await categories.findOne({ type: type });
		const user = await User.findOne({ username: username });

		if (username != req.params.username)
			return res.status(400).json({ error: "Username in body and in url must be the same" });
		if (!category) return res.status(400).json({ error: "Category does not exist" });
		if (!user) return res.status(400).json({ error: "User does not exist" });
		if (typeof amount != "number" && typeof amount != "string")
			return res.status(400).json({ error: "Amount must be a number or a string" });
		if (typeof amount == "string" && isNaN(amount))
			return res.status(400).json({ error: "Amount must be a valid numeric string" });
		amount = parseFloat(amount);

		//const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });

		//if (!adminAuth.flag) {
		if (!userAuth.flag) return res.status(401).json({ error: userAuth.cause });
		//}

		await transactions
			.create({ username, type, amount })
			.then((data) => res.status(200).json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage }));
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by all users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - empty array must be returned if there are no transactions
 */
export const getAllTransactions = async (req, res) => {
	try {
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });

		/**
		 * MongoDB equivalent to the query "SELECT * FROM transactions, categories WHERE transactions.type = categories.type"
		 */
		const filteredTransactions = await transactions.aggregate([
			{
				$lookup: {
					from: "categories",
					localField: "type",
					foreignField: "type",
					as: "categories_info",
				},
			},
			{ $unwind: "$categories_info" },
			{ $project: { _id: 0, username: 1, type: 1, amount: 1, date: 1, color: "$categories_info.color" } },
		]);

		return res
			.status(200)
			.json({ data: filteredTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by a specific user
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 400 is returned if the user does not exist
    - empty array is returned if there are no transactions made by the user
    - if there are query parameters and the function has been called by a Regular user then the returned transactions must be filtered according to the query parameters
 */
export const getTransactionsByUser = async (req, res) => {
	try {
		if (!req.params.username) return res.status(400).json({ error: "Missing parameters" });
		if (req.params.username.trim() === "") return res.status(400).json({ error: "Empty parameters" });

		const username = req.params.username;
		const user = await User.findOne({ username: username });
		if (!user) return res.status(400).json({ error: "User does not exist" });

		if (req.url.split("/")[1] == "users") {
			// user endpoint
			const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
			if (!userAuth.flag) return res.status(401).json({ error: userAuth.cause });

			const amountFilter = handleAmountFilterParams(req);
			const dateFilter = handleDateFilterParams(req);

			const filteredTransactions = await transactions.aggregate([
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
				{ $match: { username: username, amount: amountFilter.amount, date: dateFilter.date } },
				{ $project: { _id: 0, username: 1, type: 1, amount: 1, date: 1, color: "$categories_info.color" } },
			]);

			if (filteredTransactions.length == 0)
				return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage });

			return res
				.status(200)
				.json({ data: filteredTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
		} else if (req.url.split("/")[1] == "transactions") {
			// admin endpoint
			const adminAuth = verifyAuth(req, res, { authType: "Admin" });
			if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });

			const filteredTransactions = await transactions.aggregate([
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
				{ $match: { username: username } },
				{ $project: { _id: 0, username: 1, type: 1, amount: 1, date: 1, color: "$categories_info.color" } },
			]);

			if (filteredTransactions.length == 0)
				return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage });

			return res
				.status(200)
				.json({ data: filteredTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by a specific user filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Optional behavior:
    - empty array is returned if there are no transactions made by the user with the specified category
    - error 400 is returned if the user or the category does not exist
 */
export const getTransactionsByUserByCategory = async (req, res) => {
	try {
		if (!req.params.username || !req.params.category) return res.status(400).json({ error: "Missing parameters" });
		if (req.params.username.trim() == "" || req.params.category.trim() == "")
			return res.status(400).json({ error: "Empty parameters" });

		const username = req.params.username;
		const user = await User.findOne({ username: username });
		if (!user) return res.status(400).json({ error: "User does not exist" });
		const categoryName = req.params.category;
		const category = await categories.findOne({ type: categoryName });
		if (!category) return res.status(400).json({ error: "Category does not exist" });

		if (req.url.split("/")[1] == "users") {
			// user endpoint
			const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
			if (!userAuth.flag) return res.status(401).json({ error: userAuth.cause });
		} else if (req.url.split("/")[1] == "transactions") {
			// admin endpoint
			const adminAuth = verifyAuth(req, res, { authType: "Admin" });
			if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });
		}

		const filteredTransactions = await transactions.aggregate([
			{
				$lookup: {
					from: "categories",
					localField: "type",
					foreignField: "type",
					as: "categories_info",
				},
			},
			{ $unwind: "$categories_info" },
			{ $match: { username: username, type: categoryName } },
			{ $project: { _id: 0, username: 1, type: 1, amount: 1, date: 1, color: "$categories_info.color" } },
		]);

		if (filteredTransactions.length == 0)
			return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage });

		return res
			.status(200)
			.json({ data: filteredTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by members of a specific group
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 400 is returned if the group does not exist
    - empty array must be returned if there are no transactions made by the group
 */
export const getTransactionsByGroup = async (req, res) => {
	try {
		const groupName = req.params.name;

		if (!groupName) return res.status(400).json({ error: "Missing parameters" });
		if (groupName.trim() == "") return res.status(400).json({ error: "Empty parameters" });

		const group = await Group.findOne({ name: groupName });
		if (!group) return res.status(400).json({ error: "Group doesn't exists" });

		if (req.url.split("/")[1] == "groups") {
			// user endpoint
			const groupAuth = verifyAuth(req, res, {
				authType: "Group",
				emails: group.members.map((v) => v.email),
			});
			if (!groupAuth.flag) return res.status(401).json({ error: groupAuth.cause });
		} else if (req.url.split("/")[1] == "transactions") {
			// admin endpoint
			const adminAuth = verifyAuth(req, res, { authType: "Admin" });
			if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });
		}

		const aggregatedTransactions = await transactions.aggregate([
			{
				$lookup: {
					from: "categories",
					localField: "type",
					foreignField: "type",
					as: "categories_info",
				},
			},
			{ $unwind: "$categories_info" },
			{ $project: { _id: 0, username: 1, type: 1, amount: 1, date: 1, color: "$categories_info.color" } },
		]);

		// returns a boolean array with true if the user is in the group, false otherwise
		const mapResult = await Promise.all(
			aggregatedTransactions.map(async (v) => {
				const user = await User.findOne({ username: v.username }, { _id: 0, email: 1 });
				return group.members.map((g) => g.email).includes(user.email);
			})
		);

		const filteredTransactions = aggregatedTransactions.filter((v) => mapResult[aggregatedTransactions.indexOf(v)]);

		if (filteredTransactions.length == 0)
			return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage });

		return res
			.status(200)
			.json({ data: filteredTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by members of a specific group filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Optional behavior:
    - error 400 is returned if the group or the category does not exist
    - empty array must be returned if there are no transactions made by the group with the specified category
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
	try {
		const groupName = req.params.name;
		const categoryName = req.params.category;

		if (!groupName || !categoryName) return res.status(400).json({ error: "Missing parameters" });
		if (groupName.trim() == "" || categoryName.trim() == "") return res.status(400).json({ error: "Empty parameters" });

		const group = await Group.findOne({ name: groupName });
		if (!group) return res.status(400).json({ error: "Group doesn't exists" });
		const category = await categories.findOne({ type: categoryName });
		if (!category) return res.status(400).json({ error: "Category doesn't exists" });

		if (req.url.split("/")[1] == "groups") {
			// user endpoint
			const groupAuth = verifyAuth(req, res, {
				authType: "Group",
				emails: group.members.map((v) => v.email),
			});
			if (!groupAuth.flag) return res.status(401).json({ error: groupAuth.cause });
		} else if (req.url.split("/")[1] == "transactions") {
			// admin endpoint
			const adminAuth = verifyAuth(req, res, { authType: "Admin" });
			if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });
		}

		const aggregatedTransactions = await transactions.aggregate([
			{
				$lookup: {
					from: "categories",
					localField: "type",
					foreignField: "type",
					as: "categories_info",
				},
			},
			{ $unwind: "$categories_info" },
			{ $match: { type: categoryName } },
			{ $project: { _id: 0, username: 1, type: 1, amount: 1, date: 1, color: "$categories_info.color" } },
		]);

		// returns a boolean array with true if the user is in the group, false otherwise
		const mapResult = await Promise.all(
			aggregatedTransactions.map(async (v) => {
				const user = await User.findOne({ username: v.username }, { _id: 0, email: 1 });
				return group.members.map((g) => g.email).includes(user.email);
			})
		);

		const filteredTransactions = aggregatedTransactions.filter((v) => mapResult[aggregatedTransactions.indexOf(v)]);

		if (filteredTransactions.length == 0)
			return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage });

		return res
			.status(200)
			.json({ data: filteredTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Delete a transaction made by a specific user
  - Request Body Content: The `_id` of the transaction to be deleted
  - Response `data` Content: A string indicating successful deletion of the transaction
  - Optional behavior:
    - error 400 is returned if the user or the transaction does not exist
 */
export const deleteTransaction = async (req, res) => {
	try {
		const user = await User.findOne({ username: req.params.username });

		if (!user) {
			return res.status(400).json({ error: "User does not exist" });
		}

		const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });

		if (!adminAuth.flag) {
			if (!userAuth.flag) return res.status(401).json({ error: adminAuth.cause });
		}

		if (!req.body._id) {
			return res.status(400).json({ error: "Missing parameters" });
		}
		const transactionId = req.body._id;
		const transaction = await transactions.findOne({ _id: transactionId });
		if (!transaction) {
			return res.status(400).json({ error: "Transaction does not exist" });
		}

		if (transaction.username != req.params.username) {
			return res.status(400).json({ error: "User mismatch" });
		}

		await transactions.deleteOne({ _id: transactionId });
		return res
			.status(200)
			.json({ data: { message: "Transaction deleted" }, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

/**
 * Delete multiple transactions identified by their ids
  - Request Body Content: An array of strings that lists the `_ids` of the transactions to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 400 is returned if at least one of the `_ids` does not have a corresponding transaction. Transactions that have an id are not deleted in this case
 */
export const deleteTransactions = async (req, res) => {
	try {
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });

		if (!req.body._ids) {
			return res.status(400).json({ error: "Missing parameters" });
		}
		const transactionsList = req.body._ids;
		for (const id of transactionsList) {
			if (id.trim() == "") return res.status(400).json({ error: "Empty string in _ids" });
		}
		for (const id of transactionsList) {
			const tx_id = await transactions.findOne({ _id: id });
			if (!tx_id) return res.status(400).json({ error: "transaction _id is not valid" });
		}

		const tx_id = await transactions.find({ _id: { $in: transactionsList } });
		if (tx_id.length < transactionsList.length) {
			return res.status(400).json({ error: "At least one of the ids does not have a corresponding transaction" });
		}

		await transactions.deleteMany({ _id: { $in: transactionsList } });
		return res
			.status(200)
			.json({ data: { message: "Transactions deleted" }, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
