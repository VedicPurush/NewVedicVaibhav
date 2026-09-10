"use client";

import React from "react";
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { Col } from "antd";

export interface PujaTextFieldProps {
  labelText: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  /** if provided, renders before the input, but is not part of value */
  prefix?: string;
  /** any node you want to show (e.g. an <img> or emoji) before the prefix text */
  prefixIcon?: React.ReactNode;
}

const PujaTextField: React.FC<PujaTextFieldProps> = ({
  labelText,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  maxLength,
  prefix,
  prefixIcon,
}) => {
  // Build up the InputAdornment only if prefix is passed
  const startAdornment =
    prefix != null ? (
      <InputAdornment position="start" sx={{ gap: 1, pl: 0 }}>
        {prefixIcon}
        <Typography variant="body1" component="span">
          {prefix}
        </Typography>
      </InputAdornment>
    ) : undefined;

  return (
    <>
      {/* mobile-only */}
      <Col xs={24} sm={24} md={0} lg={0} xl={0}>
        <TextField
          variant="outlined"
          placeholder={placeholder || labelText}
          fullWidth
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          InputProps={{
            startAdornment,
            inputProps: { maxLength },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              marginBottom: "7%",
              height: "45px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              backgroundColor: disabled ? "grey" : "white",
              "& fieldset": { borderColor: "rgba(0,0,0,0.5)" },
              "&:hover fieldset": { borderColor: "black" },
              "&.Mui-focused fieldset": { borderColor: "rgba(0,0,0,0.9)" },
              overflow: "hidden",
            },
            "& .MuiInputBase-root": { height: "85%" },
            "& .MuiOutlinedInput-input": {
              padding: "10px 12px",
              height: "14px",
              backgroundColor: disabled ? "#E8E8E8" : "white",
            },
            "& .MuiInputBase-input::placeholder": {
              fontSize: "14px",
              color: "rgba(0, 0, 0, 0.8)",
            },
          }}
        />
      </Col>
      {/* desktop-only */}
      <Col xs={0} sm={0} md={24} lg={24} xl={24}>
        <TextField
          variant="outlined"
          placeholder={placeholder || labelText}
          fullWidth
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          InputProps={{
            startAdornment,
            inputProps: { maxLength },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              marginBottom: "1.5%",
              height: "45px",
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.1)",
              backgroundColor: disabled ? "grey" : "white",
              "& fieldset": { borderColor: "rgba(0,0,0,0.5)" },
              "&:hover fieldset": { borderColor: "black" },
              "&.Mui-focused fieldset": { borderColor: "rgba(0,0,0,0.9)" },
              overflow: "hidden",
            },
            "& .MuiInputBase-root": { height: "85%" },
            "& .MuiOutlinedInput-input": {
              padding: "10px 12px",
              height: "14px",
              backgroundColor: disabled ? "#E8E8E8" : "white",
            },
            "& .MuiInputBase-input::placeholder": {
              fontSize: "14px",
              color: "rgba(0, 0, 0, 0.8)",
            },
          }}
        />
      </Col>
    </>
  );
};

export default PujaTextField;
