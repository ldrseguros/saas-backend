// Basic protected controller function

export const getProtectedData = (req, res) => {
  // This function will only be reached if the JWT is valid
  res.status(200).json({ message: "This is protected data", user: req.user });
};
