import API from "../api/axios";

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await API.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.url;
};
