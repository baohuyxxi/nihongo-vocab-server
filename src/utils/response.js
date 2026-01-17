export const successResponse = (
  res,
  data,
  message = "Success",
  extra = {}
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    ...extra,
  });
};

export const errorResponse = (
  res,
  message = "Server error",
  status = 500
) => {
  return res.status(status).json({
    success: false,
    message,
  });
};
