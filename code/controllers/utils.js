import jwt from "jsonwebtoken";

/**
 * Handle possible date filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `date` parameter.
 *  The returned object must handle all possible combination of date filtering parameters, including the case where none are present.
 *  Example: {date: {$gte: "2023-04-30T00:00:00.000Z"}} returns all transactions whose `date` parameter indicates a date from 30/04/2023 (included) onwards
 * @throws an error if the query parameters include `date` together with at least one of `from` or `upTo`
 */
export const handleDateFilterParams = (req) => {
	const { date, from, upTo } = req.query;
	if (date && (from || upTo)) throw new Error("Cannot use date together with from or upTo");

	if (date) {
		// automatically throw an error if the date is not in the correct format
		const dateString = new Date(date);
		const startDateString = dateString.toISOString();
		const endDateString = new Date(dateString.setUTCHours(23, 59, 59, 999)).toISOString();
		return { date: { $gte: new Date(startDateString), $lte: new Date(endDateString) } };
	}
	if (from && upTo) {
		// automatically throw an error if the date is not in the correct format
		const fromString = new Date(from).toISOString();
		const upToString = new Date(new Date(upTo).setUTCHours(23, 59, 59, 999)).toISOString();
		return { date: { $gte: new Date(fromString), $lte: new Date(upToString) } };
	}
	if (from) {
		// automatically throw an error if the date is not in the correct format
		const fromString = new Date(from).toISOString();
		return { date: { $gte: new Date(fromString) } };
	}
	if (upTo) {
		// automatically throw an error if the date is not in the correct format
		const upToString = new Date(new Date(upTo).setUTCHours(23, 59, 59, 999)).toISOString();
		return { date: { $lte: new Date(upToString) } };
	}
	return { date: { $exists: true } };
};

/**
 * Handle possible authentication modes depending on `authType`
 * @param req the request object that contains cookie information
 * @param res the result object of the request
 * @param info an object that specifies the `authType` and that contains additional information, depending on the value of `authType`
 *      Example: {authType: "Simple"}
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *          - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * @returns true if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
 *  Refreshes the accessToken if it has expired and the refreshToken is still valid
 */
export const verifyAuth = (req, res, info) => {
	const cookie = req.cookies;
	if (!cookie.accessToken || !cookie.refreshToken) {
		return { flag: false, cause: "Unauthorized" };
	}
	try {
		const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);
		const decodedRefreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY);
		if (!decodedAccessToken.username || !decodedAccessToken.email || !decodedAccessToken.role) {
			return { flag: false, cause: "Token is missing information" };
		}
		if (!decodedRefreshToken.username || !decodedRefreshToken.email || !decodedRefreshToken.role) {
			return { flag: false, cause: "Token is missing information" };
		}
		if (
			decodedAccessToken.username !== decodedRefreshToken.username ||
			decodedAccessToken.email !== decodedRefreshToken.email ||
			decodedAccessToken.role !== decodedRefreshToken.role
		) {
			return { flag: false, cause: "Mismatched users" };
		}

		if (info.authType === "Simple") {
			return { flag: true, cause: "Authorized" };
		} else if (info.authType === "User") {
			if (decodedAccessToken.username === info.username && decodedRefreshToken.username === info.username)
				return { flag: true, cause: "Authorized" };
			return { flag: false, cause: "Unauthorized: invalid user" };
		} else if (info.authType === "Admin") {
			if (decodedAccessToken.role === "Admin" && decodedRefreshToken.role === "Admin")
				return { flag: true, cause: "Authorized" };
			return { flag: false, cause: "Unauthorized: not an admin" };
		} else if (info.authType === "Group") {
			if (info.emails.includes(decodedAccessToken.email) && info.emails.includes(decodedRefreshToken.email))
				return { flag: true, cause: "Authorized" };
			return { flag: false, cause: "Unauthorized: user is not in requested group" };
		} else return { flag: false, cause: "Unauthorized" };
	} catch (err) {
		if (err.name === "TokenExpiredError") {
			try {
				const refreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY);

				// check if the user is authorized to access the requested resource depending on the authType
				if (info.authType === "User") {
					if (!(refreshToken.username === info.username)) return { flag: false, cause: "Unauthorized: invalid user" };
				} else if (info.authType === "Admin") {
					if (!(refreshToken.role === "Admin")) return { flag: false, cause: "Unauthorized: not an admin" };
				} else if (info.authType === "Group") {
					if (!info.emails.includes(refreshToken.email))
						return { flag: false, cause: "Unauthorized: user is not in requested group" };
				} else if (info.authType === "Simple") {
				} else return { flag: false, cause: "Unauthorized" };

				// if user is authorized refresh the accessToken
				const newAccessToken = jwt.sign(
					{
						username: refreshToken.username,
						email: refreshToken.email,
						id: refreshToken.id,
						role: refreshToken.role,
					},
					process.env.ACCESS_KEY,
					{ expiresIn: "1h" }
				);

				res.cookie("accessToken", newAccessToken, {
					httpOnly: true,
					path: "/api",
					maxAge: 60 * 60 * 1000,
					sameSite: "none",
					secure: true,
				});

				res.locals.refreshedTokenMessage =
					"Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls";

				return { flag: true, cause: "Authorized" };
			} catch (err) {
				if (err.name === "TokenExpiredError") {
					return { flag: false, cause: "Perform login again" };
				} else {
					return { flag: false, cause: err.name };
				}
			}
		} else {
			return { flag: false, cause: err.name };
		}
	}
};

/**
 * Handle possible amount filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `amount` parameter.
 *  The returned object must handle all possible combination of amount filtering parameters, including the case where none are present.
 *  Example: {amount: {$gte: 100}} returns all transactions whose `amount` parameter is greater or equal than 100
 */
export const handleAmountFilterParams = (req) => {
	const { min, max } = req.query;

	if (!min && !max) return { amount: { $exists: true } };

	if (!min) {
		if (isNaN(max)) throw new Error("Invalid amount parameters");
		return { amount: { $lte: parseFloat(max) } };
	}
	if (!max) {
		if (isNaN(min)) throw new Error("Invalid amount parameters");
		return { amount: { $gte: parseFloat(min) } };
	}
	if (isNaN(min) || isNaN(max)) throw new Error("Invalid amount parameters");
	return { amount: { $gte: parseFloat(min), $lte: parseFloat(max) } };
};

export const verifyEmail = (email) => {
	if (
		String(email)
			.toLowerCase()
			.match(
				/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
			)
	)
		return true;
};
