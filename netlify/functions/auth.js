// simple test function for Netlify functions
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "GitHub Auth test endpoint OK" }),
  };
};
