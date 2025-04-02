"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import styles from "@/styles/page.module.css"; // Import styles

interface FormFieldProps {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const { set: setToken } = useLocalStorage<string>("token", "");
  const { set: setUserId } = useLocalStorage<string>("userId", "");
  const { set: setUsername } = useLocalStorage<string>("username", "");

  const handleLogin = async (values: FormFieldProps) => {
    try {
      // Call the API service and let it handle JSON serialization and error handling
      const response = await apiService.post<User>("/users", values);
      
      // Store token if available
      if (response.token) {
        setToken(response.token);
      }

      // Store user ID if available
      if (response.id) {
        setUserId(response.id);
      }

      // Store username (keep this from the original mock implementation)
      setUsername(values.username);
      console.log("Username stored in LocalStorage:", values.username);

      // Navigate to the user overview
      router.push("/users");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the registration:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during registration.");
      }
    }
  };

  return (
    <div className={styles.mainPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginContent}>
          <h1 className={styles.title}>Snake with Friends</h1>
          <div className={styles.greenContainer}>
            <Form
              form={form}
              name="login"
              size="large"
              variant="outlined"
              onFinish={handleLogin}
              layout="vertical"
            >
              <Form.Item>
                <h1 className="login-title">Register a new User</h1>
              </Form.Item>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please input your username!" }]}
              >
                <Input placeholder="Enter username" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: "Please enter your password!" }]}
              >
                <Input.Password placeholder="Enter password" />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary"
                  variant="solid"
                  color="blue"
                  htmlType="submit"
                  className="login-button">
                  Register
                </Button>
              </Form.Item>
            </Form>
          </div>
          <br></br>
          <div className={styles.greenContainer}>
            <h2 className="login-title">Already have an Account?</h2>
            <br></br>
            <Button
                type="primary"
                variant="solid"
                color="blue"
                className="login-button"
                onClick={() => router.push("/mock/login")}
              >
                Login with an existing User
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
