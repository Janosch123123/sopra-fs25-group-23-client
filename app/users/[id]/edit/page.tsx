"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { User } from "@/types/user";
import { Form, Input, Button } from 'antd';
import { useApi } from "@/hooks/useApi";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';
import './editUserProfile.css'; // Import the CSS file

const EditUserProfile = () => {
  const router = useRouter();
  const { id } = useParams();
  const apiService = useApi();
  
  const [user, setUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const formatedToken = token.replace(/"/g, '');
        await apiService.post<{ authorized: boolean }>("/auth/verify/user", { formatedToken, id });

      } catch (error: unknown) {
        if ((error as { status?: number }).status === 403) {
          const url = "/users/" + id;
          router.push(url);
        } else {
          router.push("/login");
        }
      }
    };

    checkToken();
    const fetchUser = async () => {
      try {
        const response = await apiService.get<User>(`/users/${id}`);
        setUser(response);
        form.setFieldsValue({
          username: response.username,
        });
        setBirthDate(response.birthDate ? new Date(response.birthDate) : null);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id, apiService, form, router]);

  const handleSave = async (values: { username: string }) => {
    try {
      await apiService.put(`/users/${id}`, {
        id,
        username: values.username,
        birthDate: birthDate ? dayjs(birthDate).format('YYYY-MM-DD') : null,
      });
      router.push(`/users/${id}`);
    } catch (error) {
      alert (`Error updating user data. Probably the username is already taken.${error}`);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="form-container"> {/* Add className for the form container */}
      <Form form={form} onFinish={handleSave} layout="vertical">
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: 'Please input your (new) username!' }]}
          className="form-item-long" // Add className for styling
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="birthDate"
          label="Birth Date"
          className="form-item-long" // Add className for styling
        >
          <DatePicker
            selected={birthDate}
            onChange={(date: Date | null) => setBirthDate(date)}
            dateFormat="yyyy-MM-dd"
            className="ant-input"
            wrapperClassName="date-picker-wrapper" // Add a wrapper class
          />
        </Form.Item>
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <br /> {/* Add a line break */}
        <Form.Item className="form-item-center"> {/* Add className for centering */}
          <Button type="primary" htmlType="submit">Save</Button>
        </Form.Item>
        <Form.Item className="form-item-back"> 
          <Button onClick={() => router.push("/users/" + id)}>Dissmiss</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditUserProfile;
