import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "user";

export async function getStoredUserJson(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}

export async function setStoredUserJson(json: string): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, json);
}

export async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}
