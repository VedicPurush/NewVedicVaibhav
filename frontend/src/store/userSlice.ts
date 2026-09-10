import { createSlice } from "@reduxjs/toolkit";

interface UserState {
  showLoginCard: boolean;
  userDetails: any;
}

const getUserDetailsFromLocalStorage = () => {
  if (typeof window === "undefined") return {};
  const storedUserDetails = localStorage.getItem("userDetails");

  // Check if the stored value exists and is not the string "undefined"
  if (storedUserDetails && storedUserDetails !== "undefined") {
    try {
      return JSON.parse(storedUserDetails); // Try to parse the stored value
    } catch (error) {
      console.error("Error parsing userDetails from localStorage:", error);
      localStorage.removeItem("userDetails"); // Remove invalid item from localStorage
      return {}; // Return an empty object as fallback
    }
  }
  return {}; // Return an empty object if no valid value exists
};

const initialState: UserState = {
  showLoginCard: false,
  userDetails: getUserDetailsFromLocalStorage(),
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setShowLoginCard: (state, action) => {
      state.showLoginCard = action.payload; // This action sets whether the login card is shown or not
    },
    setUserDetails: (state, action) => {
      state.userDetails = action.payload; // This will update user details if needed
    },
  },
});

export const { setShowLoginCard, setUserDetails } = userSlice.actions;
export default userSlice.reducer;
