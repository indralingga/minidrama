import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all providers (with optional active filter)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  try {
    const providers = await prisma.provider.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(providers);
  } catch (error: any) {
    console.error("Failed to fetch providers:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST create provider (Admin only placeholder)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, category, iconUrl, apiBaseUrl, sortOrder } = body;

    if (!name || !slug || !category || !apiBaseUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const provider = await prisma.provider.create({
      data: {
        name,
        slug,
        category,
        iconUrl,
        apiBaseUrl,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create provider:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT / PATCH update provider (Admin only placeholder)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, slug, category, iconUrl, apiBaseUrl, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing provider ID" }, { status: 400 });
    }

    const provider = await prisma.provider.update({
      where: { id },
      data: {
        name,
        slug,
        category,
        iconUrl,
        apiBaseUrl,
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json(provider);
  } catch (error: any) {
    console.error("Failed to update provider:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
