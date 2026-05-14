# Product Image Upload Setup

This guide explains how to set up the Supabase Storage bucket for product image uploads.

## Prerequisites

- Access to your Supabase project dashboard
- Admin permissions to create storage buckets

## Setup Steps

### 1. Create the Storage Bucket

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Configure the bucket:
   - **Name**: `product_images`
   - **Privacy**: Select **Public** (so images can be accessed publicly)
6. Click **Create bucket**

### 2. Configure Bucket Policies (Optional)

For additional security, you can set up Row Level Security (RLS) policies, but for a public bucket, the default settings are fine.

### 3. Verify Setup

Test the upload feature:
1. Navigate to the Products page in your app
2. Click **New Product** or edit an existing product
3. Click the **Upload Photo** button
4. Select an image file from your computer
5. The image should upload and display as a preview
6. Save the product

## Troubleshooting

### "Failed to upload image" Error

**Possible Causes:**
- Bucket doesn't exist or has a different name
- Bucket is set to Private instead of Public
- Insufficient permissions

**Solution:**
- Verify the bucket name is exactly `product_images`
- Ensure the bucket privacy is set to **Public**
- Check your Supabase project permissions

### Images Not Displaying

- Verify the bucket is public
- Check the browser console for CORS errors
- Ensure the image URL is accessible

## How It Works

1. User selects an image via the **Upload Photo** button
2. Image is uploaded to Supabase Storage (`product_images` bucket)
3. A public URL is generated and automatically set in the product's `image_url` field
4. Product is saved with the image URL
5. Images are displayed in product cards and quotations

## File Naming

Uploaded files are named with a timestamp prefix to ensure uniqueness:
```
{timestamp}-{original-filename}
```

This prevents conflicts if users upload files with the same name.
