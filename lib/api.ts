// This is a mock API to simulate network requests.
// In a real application, you would use fetch or a library like axios
// to make actual HTTP requests to your backend server.

const mockApi = {
  call: <T>(data?: T): Promise<T | null> => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(data || null);
      }, 500); // Simulate a 500ms network delay
    });
  },
};

export { mockApi };
