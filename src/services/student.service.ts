import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";

const prisma = getPrismaClient();

const studentService = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};

export default studentService;

async function getAllStudents(params?: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  fields?: string;
  query?: string;
  filters?: Record<string, any>;
}) {
  try {
    const { page = 1, limit = 10, sort, order = "desc", fields, query, filters } = params || {};

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.StudentProfileWhereInput = {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { studentId: { contains: query, mode: "insensitive" } },
              { course: { contains: query, mode: "insensitive" } },
              { yearLevel: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      // Apply dynamic filters
      ...(filters || {}),
    };

    const findManyQuery: Prisma.StudentProfileFindManyArgs = {
      where: whereClause,
      skip,
      take: limit,
      orderBy: sort
        ? typeof sort === "string" && !sort.startsWith("{")
          ? { [sort]: order }
          : JSON.parse(sort)
        : undefined,
    };

    // Handle field selection - default to only "id" if no fields specified
    const fieldSelections = fields
      ? fields.split(",").reduce(
          (acc, field) => {
            const parts = field.trim().split(".");
            if (parts.length > 1) {
              const [parent, ...children] = parts;
              acc[parent] = acc[parent] || { select: {} };

              let current = acc[parent].select;
              for (let i = 0; i < children.length - 1; i++) {
                current[children[i]] = current[children[i]] || { select: {} };
                current = current[children[i]].select;
              }
              current[children[children.length - 1]] = true;
            } else {
              acc[parts[0]] = true;
            }
            return acc;
          },
          { id: true } as Record<string, any>
        )
      : { id: true };

    findManyQuery.select = fieldSelections;

    const [students, total] = await Promise.all([
      prisma.studentProfile.findMany(findManyQuery),
      prisma.studentProfile.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: "Students retrieved successfully",
      data: students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  } catch (error) {
    console.error("Get students error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function getStudentById(id: string, fields?: string) {
  try {
    const query: Prisma.StudentProfileFindUniqueArgs = {
      where: {
        id,
        isDeleted: false,
      },
    };

    // Handle field selection - default to only "id" if no fields specified
    const fieldSelections = fields
      ? fields.split(",").reduce(
          (acc, field) => {
            const parts = field.trim().split(".");
            if (parts.length > 1) {
              const [parent, ...children] = parts;
              acc[parent] = acc[parent] || { select: {} };

              let current = acc[parent].select;
              for (let i = 0; i < children.length - 1; i++) {
                current[children[i]] = current[children[i]] || { select: {} };
                current = current[children[i]].select;
              }
              current[children[children.length - 1]] = true;
            } else {
              acc[parts[0]] = true;
            }
            return acc;
          },
          { id: true } as Record<string, any>
        )
      : { id: true };

    query.select = fieldSelections;

    const student = await prisma.studentProfile.findUnique(query);

    if (!student) {
      return {
        success: false,
        message: "Student not found",
      };
    }

    return {
      success: true,
      message: "Student retrieved successfully",
      data: student,
    };
  } catch (error) {
    console.error("Get student error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function createStudent(data: Prisma.StudentProfileCreateInput) {
  try {
    // Check if student id already exists
    const existingStudent = await prisma.studentProfile.findUnique({
      where: { studentId: data.studentId },
    });

    if (existingStudent) {
      return { success: false, message: "Student ID already exists" };
    }

    // Create student
    const student = await prisma.studentProfile.create({
      data: {
        studentId: data.studentId,
        dateOfBirth: data.dateOfBirth,
        course: data.course,
        yearLevel: data.yearLevel,
        schoolEmail: data.schoolEmail,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        studentIdPhoto: data.studentIdPhoto,
        user: data.user,
      },
      select: {
        id: true,
        userId: true,
        studentId: true,
        dateOfBirth: true,
        course: true,
        yearLevel: true,
        schoolEmail: true,
        emergencyContactName: true,
        emergencyContactNumber: true,
        studentIdPhoto: true,
      },
    });

    return { success: true, data: student, message: "Student created successfully" };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, message: "Server error" };
  }
}

async function updateStudent(id: string, data: Prisma.StudentProfileUpdateInput) {
  try {
    // Check if student exists
    const existingStudent = await prisma.studentProfile.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        message: "Student not found",
      };
    }

    // Prepare update data
    const updateData = { ...data };

    // Update user
    const updatedUser = await prisma.studentProfile.update({
      where: { id },
      data: {
        ...updateData,
      },
      select: {
        id: true,
        userId: true,
        studentId: true,
        dateOfBirth: true,
        course: true,
        yearLevel: true,
        schoolEmail: true,
        emergencyContactName: true,
        emergencyContactNumber: true,
        studentIdPhoto: true,
      },
    });

    return {
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    };
  } catch (error) {
    console.error("Update user error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteStudent(id: string) {
  try {
    // Check if user exists
    const existingStudent = await prisma.studentProfile.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        message: "Student not found",
      };
    }

    // Soft delete student
    await prisma.studentProfile.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: "Student deleted successfully",
    };
  } catch (error) {
    console.error("Delete student error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
