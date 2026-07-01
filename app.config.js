const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "献立ノート (dev)" : "献立ノート",
    slug: "meal-planner",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      backgroundColor: "#faf5ef",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? "com.yourname.mealplanner.dev"
        : "com.yourname.mealplanner",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#faf5ef",
      },
      package: IS_DEV
        ? "com.yourname.mealplanner.dev"
        : "com.yourname.mealplanner",
    },
    scheme: "meal-planner",
    updates: {
      url: "https://u.expo.dev/44c332a0-88e3-4e7a-b0ef-94e5853f6269",
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
    plugins: [
      "expo-asset",
      "expo-font",
      "expo-secure-store",
      "expo-web-browser",
    ],
    extra: {
      eas: {
        projectId: "44c332a0-88e3-4e7a-b0ef-94e5853f6269",
      },
    },
    owner: process.env.EXPO_OWNER,
  },
};
