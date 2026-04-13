"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuth, useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import styles from "./page.module.css";

type Product = {
  id: string;
  product_name: string;
  description: string;
  product_price: number;
  product_cost: number;
  quantity: number;
  category: string;
  images: string[];
};

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();

  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const role = user?.publicMetadata?.role;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Product>({
    id: "",
    product_name: "",
    description: "",
    product_price: 0,
    product_cost: 0,
    quantity: 0,
    category: "",
    images: [],
  });

  const [newImages, setNewImages] = useState<File[]>([]);

  // ---------------- AUTH GUARD ----------------
  useEffect(() => {
    if (isLoaded && role && role !== "admin") {
      toast.error("Access denied");
      router.push("/dashboard");
    }
  }, [role, isLoaded, router]);

  // ---------------- FETCH PRODUCT ----------------
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/products/${id}`,
        );
        setForm(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // ---------------- INPUT ----------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // ---------------- FILE UPLOAD ----------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setNewImages((prev) => [...prev, ...Array.from(files)]);
  };

  const removeExistingImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------------- CLOUDINARY UPLOAD ----------------
  async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
    );

    return res.data.secure_url;
  }

  // ---------------- UPDATE ----------------
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const token = await getToken();

      // upload ONLY new images
      const uploadedUrls = await Promise.all(newImages.map(uploadToCloudinary));

      const finalImages = [...form.images, ...uploadedUrls];

      await axios.patch(
        `http://localhost:5000/products/${id}`,
        {
          product_name: form.product_name,
          description: form.description,
          category: form.category,
          product_price: form.product_price,
          product_cost: form.product_cost,
          quantity: form.quantity,
          images: finalImages,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Product updated");
      router.push(`/dashboard/inventory/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading product...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Edit Product</h2>

        {/* TOP ACTIONS */}
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => router.push(`/dashboard/inventory/${id}`)}
          >
            ← Cancel
          </button>
        </div>

        <form onSubmit={handleUpdate} className={styles.form}>
          <input
            name="product_name"
            value={form.product_name}
            onChange={handleChange}
            placeholder="Product Name"
          />

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
          />

          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Category"
          />

          <input
            type="number"
            name="product_price"
            value={form.product_price}
            onChange={handleChange}
            placeholder="Price"
          />

          <input
            type="number"
            name="product_cost"
            value={form.product_cost}
            onChange={handleChange}
            placeholder="Cost"
          />

          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="Quantity"
          />

          {/* EXISTING IMAGES */}
          <div>
            <h4>Current Images</h4>
            <div className={styles.previewGrid}>
              {form.images.map((img, i) => (
                <div key={i} className={styles.imageBox}>
                  <img src={img} className={styles.previewImage} />
                  <button type="button" onClick={() => removeExistingImage(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* UPLOAD NEW IMAGES */}
          <label className={styles.uploadBox}>
            Add New Images
            <input type="file" multiple hidden onChange={handleFileChange} />
          </label>

          {/* NEW PREVIEW */}
          <div className={styles.previewGrid}>
            {newImages.map((file, i) => (
              <div key={i} className={styles.imageBox}>
                <img
                  src={URL.createObjectURL(file)}
                  className={styles.previewImage}
                />
                <button type="button" onClick={() => removeNewImage(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button disabled={saving} className={styles.submitBtn}>
            {saving ? "Updating..." : "Update Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
