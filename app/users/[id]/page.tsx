"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { User } from "@/types/user";
import { Card, Button } from 'antd';
import { useApi } from "@/hooks/useApi";

const UserProfile = () => {
  const router = useRouter();
  const { id } = useParams();
  const apiService = useApi();
  
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const formatedToken = token.replace(/"/g, '');
        const response = await apiService.post<{ authorized: boolean }>("/auth/verify", { formatedToken });
        if (!response.authorized) {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error('Error verifying user token:', error);
        router.push("/login");
      }
    };

    checkToken();
    const fetchUser = async () => {
      try {
        const response = await apiService.get<User>(`/users/${id}`);
        setUser(response);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id, apiService, router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const day = String(date.getMonth() + 1).padStart(2, '0');
    const month = String(date.getDate()).padStart(2, '0');
    return `${month}.${day}.${year}`;
  };

  const formattedBirthDate = user.birthDate ? formatDate(user.birthDate) : 'N/A';
  const formattedCreationDate = user.creationDate ? formatDate(user.creationDate) : 'N/A';

  const handleEdit = () => {
    router.push(`/users/${id}/edit`);
  };

  return (
    <Card title={user.username}>
      <p><strong>Online Status:</strong> {user.status}</p>
      <p><strong>Creation Date:</strong> {formattedCreationDate}</p>
      <p><strong>Birth Date:</strong> {formattedBirthDate}</p>
      <Button type="primary" onClick={handleEdit}>Edit</Button>
    <Button type="link" 
            onClick={() => router.push("/users")}>
      Back to overview
    </Button>
    </Card>
  );
};

export default UserProfile;
