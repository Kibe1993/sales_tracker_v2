"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ProductPage() {
  const router = useRouter();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [product, setProduct] = useState({
    product_name: "",
    description: "",
    product_cost: "",
    product_price: "",
    quantity: "",
    category: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    setAttachments((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.lastModified));
      const uniqueFiles = newFiles.filter(
        (f) => !existing.has(f.name + f.lastModified),
      );
      return [...prev, ...uniqueFiles];
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
    if (!cloudName || !uploadPreset)
      throw new Error("Missing Cloudinary config");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
      formData,
    );

    return res.data.secure_url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const imageUrls = await Promise.all(
        attachments.map((file) => uploadToCloudinary(file)),
      );

      const payload = {
        product_name: product.product_name,
        description: product.description,
        category: product.category,
        product_cost: Number(product.product_cost),
        product_price: Number(product.product_price),
        quantity: Number(product.quantity),
        images: imageUrls,
      };

      const res = await axios.post("http://localhost:5000/products", payload);
      console.log("SUCCESS:", res.data);
      toast.success("Product created successfully");

      setProduct({
        product_name: "",
        description: "",
        product_cost: "",
        product_price: "",
        quantity: "",
        category: "",
      });
      setAttachments([]);
      router.push("/dashboard/inventory");
    } catch (err: unknown) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.error || err.message);
      else setError("Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <Link href={"/dashboard"} className={styles.backLink}>
        Dashboard
      </Link>
      <h1>Add Product</h1>
      <p>Create a new product for your inventory</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Product Info */}
        <div className={styles.field}>
          <label>Product Name</label>
          <input
            type="text"
            placeholder="e.g. iPhone 15"
            name="product_name"
            onChange={handleChange}
            value={product.product_name}
          />
        </div>

        <div className={styles.field}>
          <label>Description</label>
          <textarea
            placeholder="Short product description"
            rows={4}
            name="description"
            onChange={handleChange}
            value={product.description}
          />
        </div>
        <div className={styles.field}>
          <label>Category</label>
          <select
            name="category"
            value={product.category}
            onChange={handleChange}
          >
            <option value="">Select Category</option>
            <option value="electronics">Electronics</option>
            <option value="cyber">Cyber</option>
            <option value="services">Services</option>
          </select>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Cost</label>
            <input
              type="number"
              placeholder="0.00"
              name="product_cost"
              onChange={handleChange}
              value={product.product_cost}
            />
          </div>
          <div className={styles.field}>
            <label>Price</label>
            <input
              type="number"
              placeholder="0.00"
              name="product_price"
              onChange={handleChange}
              value={product.product_price}
            />
          </div>
          <div className={styles.field}>
            <label>Quantity</label>
            <input
              type="number"
              placeholder="0"
              name="quantity"
              onChange={handleChange}
              value={product.quantity}
            />
          </div>
        </div>

        {/* Image Upload */}
        <div className={styles.field}>
          <label>Product Images</label>
          <label htmlFor="product_images" className={styles.uploadBox}>
            <span className={styles.uploadIcon}>📷</span>
            <span>Click to upload images</span>
            <span className={styles.uploadHint}>PNG, JPG up to 5MB</span>
          </label>
          <input
            id="product_images"
            type="file"
            className={styles.hiddenInput}
            onChange={handleFileChange}
            multiple
          />
        </div>

        {/* Preview selected images */}
        {attachments.length > 0 && (
          <div className={styles.previewContainer}>
            {attachments.map((file, index) => (
              <div
                key={file.name + file.lastModified}
                className={styles.previewBox}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className={styles.previewImage}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeAttachment(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Uploading..." : "Add Product"}
        </button>
      </form>
    </div>
  );
}
