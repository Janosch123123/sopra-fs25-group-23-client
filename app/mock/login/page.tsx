"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import styles from "@/styles/page.module.css"; // Import styles

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const { set: setUsername } = useLocalStorage<string>("username", "");

  const handleLogin = async (values: { username: string; password: string }) => {
    try {
      const requestData = {
        username: values.username,
        password: values.password
      };

      await apiService.post<User>("/users/login", requestData);

      setUsername(values.username); // Store the username in useLocalStorage
      console.log("Username stored in LocalStorage:", values.username);

      router.push("/users");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during login.");
      }
    }
  };

  return (
    <div className={styles.mainPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginContent}>
          <h1 className={styles.title}>Snake with Friends</h1> {/* Add title */}
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
                <h1 className="login-title">Login with existing User</h1>
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
                <Button type="primary"
                  variant="solid"
                  color = "blue"
                  className="login-button">
                  Login
                </Button>
              </Form.Item>
              <h3 className="login-title">Or</h3>
              <br></br>
              <Button
                  type="primary"
                  variant="solid"
                  color = "blue"
                  className="login-button"
                  onClick={() => router.push("/mock/register")}
                >
                  Register a new User
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
