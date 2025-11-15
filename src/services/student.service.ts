import { Prisma } from "../../prisma/generated/prisma";
import { getPrismaClient } from "../lib/db.connection";
import cloudinaryService from "../utils/cloudinary";

const prisma = getPrismaClient();

const studentService = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentIDPhoto,
  deleteStudentIDPhoto,
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
  reqQuery?: Record<string, any>;
}) {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      order = "desc",
      fields,
      query,
      filters,
      reqQuery,
    } = params || {};

    // Build dynamic filters from query parameters (format: filter_fieldName)
    let dynamicFilters: Record<string, any> = {};

    if (reqQuery) {
      Object.keys(reqQuery).forEach((key) => {
        if (key.startsWith("filter_")) {
          const fieldName = key.replace("filter_", "");
          const value = reqQuery[key];
          if (value && typeof value === "string") {
            dynamicFilters[fieldName] = value;
          }
        }
      });
    }

    // Merge provided filters with dynamic filters
    const combinedFilters = { ...filters, ...dynamicFilters };

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
      ...(combinedFilters || {}),
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

async function uploadStudentIDPhoto(studentId: string, file: Express.Multer.File) {
  try {
    // Check if student exists
    const existingStudent = await prisma.studentProfile.findUnique({
      where: {
        id: studentId,
        isDeleted: false,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        message: "Student not found",
      };
    }

    // Upload student ID photo
    try {
      const uploadResult = await cloudinaryService.uploadAttachment(
        file,
        `student-documents/${studentId}/student-id`
      );

      // Update student with new document URL and set as unverified (needs re-verification)
      const updatedStudent = await prisma.studentProfile.update({
        where: { id: studentId },
        data: {
          studentIdPhoto: uploadResult.url,
          isVerified: true,
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
          isVerified: true,
        },
      });

      return {
        success: true,
        message: "Student ID photo uploaded successfully",
        data: {
          student: updatedStudent,
          uploadResult: {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename,
          },
        },
      };
    } catch (error) {
      console.error("Student ID photo upload error:", error);
      return {
        success: false,
        message: "Failed to upload student ID photo",
      };
    }
  } catch (error) {
    console.error("Upload student ID photo error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}

async function deleteStudentIDPhoto(studentId: string) {
  try {
    // Check if student exists
    const existingStudent = await prisma.studentProfile.findUnique({
      where: {
        id: studentId,
        isDeleted: false,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        message: "Student not found",
      };
    }

    if (!existingStudent.studentIdPhoto) {
      return {
        success: true,
        message: "No student ID photo to delete",
        data: existingStudent,
      };
    }

    try {
      // Extract public ID from URL or use the full path
      const studentIdPhotoPublicId = existingStudent.studentIdPhoto.includes("student-documents")
        ? existingStudent.studentIdPhoto.split("/").slice(-3).join("/").split(".")[0]
        : null;

      if (studentIdPhotoPublicId) {
        await cloudinaryService.deleteAttachment(
          studentIdPhotoPublicId,
          `student-documents/${studentId}/student-id`
        );
      }

      // Update student - remove photo URL and set as unverified
      const updatedStudent = await prisma.studentProfile.update({
        where: { id: studentId },
        data: {
          studentIdPhoto: null,
          isVerified: false,
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
          isVerified: true,
        },
      });

      return {
        success: true,
        message: "Student ID photo deleted successfully",
        data: updatedStudent,
      };
    } catch (error) {
      console.error("Student ID photo deletion error:", error);
      // Continue with database update even if Cloudinary deletion fails
      const updatedStudent = await prisma.studentProfile.update({
        where: { id: studentId },
        data: {
          studentIdPhoto: null,
          isVerified: false,
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
          isVerified: true,
        },
      });

      return {
        success: true,
        message: "Student ID photo deleted from database (Cloudinary deletion may have failed)",
        data: updatedStudent,
      };
    }
  } catch (error) {
    console.error("Delete student ID photo error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
