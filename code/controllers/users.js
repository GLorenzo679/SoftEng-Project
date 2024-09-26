import { Group, User } from "../models/User.js";
import { transactions } from "../models/model.js";
import { verifyAuth, verifyEmail } from "./utils.js";
import jwt from "jsonwebtoken";

/**
 * Return all the users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
  - Optional behavior:
    - empty array is returned if there are no users
 */
export const getUsers = async (req, res) => {
	try {
		const authInfo = { authType: "Admin" };
		const { flag, cause } = verifyAuth(req, res, authInfo);

		if (!flag) return res.status(401).json({ error: cause });
		const users = await User.find({}, { _id: 0, username: 1, email: 1, role: 1 });

		res.status(200).json({ data: users, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json(error.message);
	}
};

/**
 * Return information of a specific user
  - Request Body Content: None
  - Response `data` Content: An object having attributes `username`, `email` and `role`.
  - Optional behavior:
    - error 400 is returned if the user is not found in the system
 */
export const getUser = async (req, res) => {
	try {
		if (!req.params.username || req.params.username.trim() === "")
			return res.status(400).json({ error: "Please provide an username" });

		const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });

		if (!adminAuth.flag) {
			if (!userAuth.flag) {
				return res.status(401).json({ error: adminAuth.cause });
			}
		}

		const username = req.params.username;
		const user = await User.findOne({ username: username });
		if (!user) return res.status(400).json({ error: "User not found" });

		const userData = {
			username: user.username,
			email: user.email,
			role: user.role,
		};

		res.status(200).json({ data: userData, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (error) {
		res.status(500).json(error.message);
	}
};
/**
 * Create a new group
  - Request Body Content: An object having a string attribute for the `name` of the group and an array that lists all the `memberEmails`
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name`
    of the created group and an array for the `members` of the group), an array that lists the `alreadyInGroup` members
    (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email
    +does not appear in the system)
  - Optional behavior:
    - error 400 is returned if there is already an existing group with the same name
    - error 400 is returned if all the `memberEmails` either do not exist or are already in a group
 */
export const createGroup = async (req, res) => {
	try {
		const groupName = req.body.name;
		const memberEmails = req.body.memberEmails;
		if (!groupName || groupName.trim() == "") return res.status(400).json({ error: "No group name provided" });
		if (!memberEmails || memberEmails.length == 0) return res.status(400).json({ error: "No group members provided" });
		const group = await Group.findOne({ name: groupName });
		if (group) return res.status(400).json({ error: "Group already exists" });

		for (const email of memberEmails)
			if (!verifyEmail(email) || email.trim() == "")
				return res.status(400).json({ error: "Email has an invalid format" });

		const simpleAuth = verifyAuth(req, res, { authType: "Simple" });
		if (!simpleAuth.flag) return res.status(401).json({ error: simpleAuth.cause });

		let alreadyInGroup = [];
		let membersNotFound = [];
		let members = [];

		for (const email of memberEmails) {
			const user = await User.findOne({ email: email });
			const group = await Group.findOne({ "members.email": email });
			if (!user) membersNotFound.push(email);
			else if (group) alreadyInGroup.push(email);
			else members.push(user);
		}

		if (members.length == 0) return res.status(400).json({ error: "No valid group members provided" });

		const decodedAccessToken = jwt.verify(req.cookies.accessToken, process.env.ACCESS_KEY);
		const userGroup = await Group.findOne({ "members.email": decodedAccessToken.email });
		if (userGroup) return res.status(400).json({ error: "Calling user is already in a group" });
		if (!memberEmails.includes(decodedAccessToken.email)) {
			const callingUser = await User.findOne({ email: decodedAccessToken.email });
			members.push(callingUser);
		}

		await Group.create({ name: groupName, members: members }).then((data) => {
			data
				.save()
				.then((data) =>
					res.status(200).json({
						data: {
							group: data,
							alreadyInGroup: alreadyInGroup,
							membersNotFound: membersNotFound,
						},
						refreshedTokenMessage: res.locals.refreshedTokenMessage,
					})
				)
				.catch((err) => {
					throw err;
				});
		});
	} catch (err) {
		res.status(500).json(err.message);
	}
};

/**
 * Return all the groups
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group
    and an array for the `members` of the group
  - Optional behavior:
    - empty array is returned if there are no groups
 */
export const getGroups = async (req, res) => {
	try {
		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });

		const groups = await Group.find();
		res.status(200).json({ data: groups, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (err) {
		res.status(500).json(err.message);
	}
};

/**
 * Return information of a specific group
  - Request Body Content: None
  - Response `data` Content: An object having a string attribute for the `name` of the group and an array for the 
    `members` of the group
  - Optional behavior:
    - error 400 is returned if the group does not exist
 */
export const getGroup = async (req, res) => {
	try {
		const groupName = req.params.name;
		if (!groupName || groupName.trim() == "") return res.status(400).json({ error: "No group name provided" });
		const group = await Group.findOne({ name: groupName });
		if (!group) return res.status(400).json({ error: "Group doesn't exists" });

		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		const groupAuth = verifyAuth(req, res, {
			authType: "Group",
			emails: group.members.map((v) => v.email),
		});

		if (!adminAuth.flag) {
			if (!groupAuth.flag) {
				return res.status(401).json({ error: adminAuth.cause });
			}
		}

		res.status(200).json({ data: group, refreshedTokenMessage: res.locals.refreshedTokenMessage });
	} catch (err) {
		res.status(500).json(err.message);
	}
};

/**
 * Add new members to a group
  - Request Body Content: An array of strings containing the emails of the members to add to the group
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include the new members as well as the old ones), 
    an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 400 is returned if the group does not exist
    - error 400 is returned if all the `memberEmails` either do not exist or are already in a group
 */
export const addToGroup = async (req, res) => {
	try {
		const groupName = req.params.name;
		const emails = req.body.emails;
		if (!groupName || groupName.trim() == "") return res.status(400).json({ error: "No group name provided" });
		if (!emails || emails.length == 0) return res.status(400).json({ error: "No group members provided" });

		const group = await Group.findOne({ name: groupName });
		if (!group) return res.status(400).json({ error: "Group doesn't exists" });

		for (const email of emails)
			if (!verifyEmail(email) || email.trim() == "")
				return res.status(400).json({ error: "Email has an invalid format" });

		if (req.url.split("/")[3] == "add") {
			// user endpoint
			const groupAuth = verifyAuth(req, res, {
				authType: "Group",
				emails: group.members.map((v) => v.email),
			});
			if (!groupAuth.flag) return res.status(401).json({ error: groupAuth.cause });
		} else if (req.url.split("/")[3] == "insert") {
			// admin endpoint
			const adminAuth = verifyAuth(req, res, { authType: "Admin" });
			if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });
		} else return res.status(400).json({ error: "Invalid endpoint" });

		let alreadyInGroup = [];
		let membersNotFound = [];
		let members = [...group.members];

		for (const email of emails) {
			const user = await User.findOne({ email: email });
			const group = await Group.findOne({ "members.email": email });
			if (!user) membersNotFound.push(email);
			else if (group) alreadyInGroup.push(email);
			else members.push(user);
		}

		if (members.length == group.members.length)
			return res.status(400).json({ error: "No valid group members provided" });

		await Group.updateOne({ name: groupName }, { $set: { members: members } });
		const newGroup = await Group.findOne({ name: groupName });
		return res.status(200).json({
			data: { group: newGroup, alreadyInGroup: alreadyInGroup, membersNotFound: membersNotFound },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (err) {
		res.status(500).json(err.message);
	}
};

/**
 * Remove members from a group
  - Request Body Content: An array of strings containing the emails of the members to remove from the group
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include only the remaining members),
    an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 400 is returned if the group does not exist
    - error 400 is returned if all the `memberEmails` either do not exist or are not in the group
 */
export const removeFromGroup = async (req, res) => {
	try {
		const groupName = req.params.name;
		let membersToRemove = req.body.emails;

		if (!groupName || groupName.trim() == "") return res.status(400).json({ error: "No group name provided" });
		if (!membersToRemove || membersToRemove.length == 0)
			return res.status(400).json({ error: "No group members provided" });

		const group = await Group.findOne({ name: groupName });
		if (!group) return res.status(400).json({ error: "Group doesn't exists" });
		if (group.members.length == 1) return res.status(400).json({ error: "Cannot remove last member" });

		for (const email of membersToRemove)
			if (!verifyEmail(email) || email.trim() == "")
				return res.status(400).json({ error: "Email has an invalid format" });

		if (req.url.split("/")[3] == "remove") {
			// user endpoint
			const groupAuth = verifyAuth(req, res, {
				authType: "Group",
				emails: group.members.map((v) => v.email),
			});
			if (!groupAuth.flag) return res.status(401).json({ error: groupAuth.cause });
		} else if (req.url.split("/")[3] == "pull") {
			// admin endpoint
			const adminAuth = verifyAuth(req, res, { authType: "Admin" });
			if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });
		}

		let notInGroup = [];
		let membersNotFound = [];
		let members = [...group.members];

		for (const email of membersToRemove) {
			const user = await User.findOne({ email: email });
			const group = await Group.findOne({ name: groupName, "members.email": email });
			if (!user) membersNotFound.push(email);
			else if (!group) notInGroup.push(email);
			else {
				for (const member of members) {
					if (member.email == email && members.length > 1) {
						members.splice(members.indexOf(member), 1);
						break;
					}
				}
			}
		}

		if (members.length == group.members.length)
			return res.status(400).json({ error: "No valid group members provided" });

		await Group.updateOne({ name: groupName }, { $set: { members: members } });
		const newGroup = await Group.findOne({ name: groupName });
		return res.status(200).json({
			data: { group: newGroup, notInGroup: notInGroup, membersNotFound: membersNotFound },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (err) {
		res.status(500).json(err.message);
	}
};

/**
 * Delete a user
  - Request Parameters: None
  - Request Body Content: A string equal to the `email` of the user to be deleted
  - Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and a boolean attribute that
    specifies whether the user was also `deletedFromGroup` or not.
  - Optional behavior:
    - error 400 is returned if the user does not exist 
 */
export const deleteUser = async (req, res) => {
	try {
		// Check if the user making the request is an admin
		const authInfo = { authType: "Admin" };
		const { flag, cause } = verifyAuth(req, res, authInfo);

		const { email } = req.body;
		if (!email || email.trim() == "") return res.status(400).json({ error: "Please provide the all the fields" });

		if (!verifyEmail(email)) return res.status(400).json({ error: "Invalid email format" });
		const existingUser = await User.findOne({ email: email });
		if (!existingUser) return res.status(400).json({ error: "User does not exist" });

		if (!flag) return res.status(401).json({ error: cause });
		if (existingUser.role == "Admin") return res.status(400).json({ error: "Cannot delete an admin user" });

		// Function to delete the user's data
		async function deleteUserData(email) {
			try {
				const user = await User.findOne({ email: email });
				const deletedTransactions = await transactions.deleteMany({ username: user.username });
				return deletedTransactions.deletedCount;
			} catch (err) {
				throw err;
			}
		}

		// Function to remove the user from groups
		async function deleteUserFromGroup(email) {
			try {
				const groups = await Group.find({ "members.email": email });

				let foundInGroup = false;

				for (const group of groups) {
					const members = group.members.filter((member) => member.email !== email);

					if (members.length === 0) {
						await Group.deleteOne({ _id: group._id });
					} else {
						await Group.updateOne({ _id: group._id }, { $set: { members } });
					}
					foundInGroup = true;
				}

				return foundInGroup;
			} catch (err) {
				return false;
			}
		}

		const deletedTransactions = await deleteUserData(email);
		const deletedFromGroup = await deleteUserFromGroup(email);

		res.status(200).json({
			data: { deletedTransactions, deletedFromGroup },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/**
 * Delete a group
  - Request Body Content: A string equal to the `name` of the group to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 400 is returned if the group does not exist
 */
export const deleteGroup = async (req, res) => {
	try {
		const groupName = req.body.name;
		if (!groupName || groupName.trim() == "") return res.status(400).json({ error: "No group name provided" });
		const group = await Group.findOne({ name: groupName });
		if (!group) return res.status(400).json({ error: "Group doesn't exists" });

		const adminAuth = verifyAuth(req, res, { authType: "Admin" });
		if (!adminAuth.flag) return res.status(401).json({ error: adminAuth.cause });

		await Group.deleteOne({ name: groupName });
		res.status(200).json({
			data: { message: "Group deleted" },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (err) {
		res.status(500).json(err.message);
	}
};
