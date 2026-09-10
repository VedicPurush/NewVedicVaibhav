"use client";

import React, { useEffect, useState } from 'react';
import { Table, DatePicker, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { api } from '@/lib/api';

const { Title } = Typography;

interface Accessory {
  name: string;
  quantity: number;
}

interface Booking {
  name: string;
  totalPrice: number;
  bookingDate: string;
  accessories: Accessory[];
}

const ChadhavaDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [_selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  const fetchBookings = async (date?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/bookings', {
        params: date ? { date } : {},
      });
      setBookings(res.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const columns: ColumnsType<Booking> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Total Price',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
    },
    {
      title: 'Booking Date',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: 'Accessories',
      dataIndex: 'accessories',
      key: 'accessories',
      render: (accessories: Accessory[]) => (
        <ul>
          {accessories?.map((item, index) => (
            <li key={index}>{item.name} (x{item.quantity})</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Chadhava Bookings Dashboard</Title>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker onChange={(date) => {
          setSelectedDate(date);
          fetchBookings(date?.format('YYYY-MM-DD'));
        }} />
      </Space>
      <Table
        dataSource={bookings}
        columns={columns}
        rowKey={(record) => `${record.name}-${record.bookingDate}`}
        loading={loading}
      />
    </div>
  );
};

export default ChadhavaDashboard;
