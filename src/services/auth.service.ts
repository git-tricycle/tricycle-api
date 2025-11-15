import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CreateUserData } from "../types";
import { getPrismaClient } from "../lib/db.connection";
import studentService from "./student.service";
import driverService from "./driver.service";
import vehicleService from "./vehicle.service";

const prisma = getPrismaClient();

const authService = {
  register,
  login,
};

export default authService;

async function register(data: CreateUserData) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, message: "User already exists" };
    }

    // If student profile data is provided, validate student ID uniqueness
    if (data.studentProfile) {
      const existingStudent = await prisma.studentProfile.findUnique({
        where: { studentId: data.studentProfile.studentId },
      });

      if (existingStudent) {
        return { success: false, message: "Student ID already exists" };
      }
    }

    // If driver profile data is provided, validate username uniqueness
    if (data.driverProfile) {
      const existingDriver = await prisma.driverProfile.findUnique({
        where: { username: data.driverProfile.username },
      });

      if (existingDriver) {
        return { success: false, message: "Driver username already exists" };
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Determine role: explicit role takes priority, otherwise infer from profile
    const userRole =
      data.role ||
      (data.studentProfile ? "passenger" : data.driverProfile ? "driver" : "passenger");

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        email: data.email,
        password: hashedPassword,
        role: userRole,
        status: data.status,
        ...(data.metadata && { metadata: data.metadata }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        role: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
    });

    let studentProfile = null;
    let driverProfile = null;

    // Create student profile if data is provided
    if (data.studentProfile) {
      const studentResult = await studentService.createStudent({
        studentId: data.studentProfile.studentId,
        dateOfBirth: new Date(data.studentProfile.dateOfBirth),
        course: data.studentProfile.course,
        yearLevel: data.studentProfile.yearLevel,
        schoolEmail: data.studentProfile.schoolEmail,
        emergencyContactName: data.studentProfile.emergencyContactName,
        emergencyContactNumber: data.studentProfile.emergencyContactNumber,
        studentIdPhoto: data.studentProfile.studentIdPhoto,
        user: {
          connect: { id: user.id },
        },
      });

      if (!studentResult.success) {
        // Rollback user creation if student creation fails
        await prisma.user.delete({ where: { id: user.id } });
        return {
          success: false,
          message: `Failed to create student profile: ${studentResult.message}`,
        };
      }

      studentProfile = studentResult.data;
    }

    // Create driver profile if data is provided
    if (data.driverProfile) {
      const driverResult = await driverService.createDriver({
        username: data.driverProfile.username,
        address: data.driverProfile.address,
        age: data.driverProfile.age,
        contactNumber: data.driverProfile.contactNumber,
        licensePhoto: data.driverProfile.licensePhoto,
        validIdPhoto: data.driverProfile.validIdPhoto,
        user: {
          connect: { id: user.id },
        },
      });

      if (!driverResult.success) {
        // Rollback user creation if driver creation fails
        await prisma.user.delete({ where: { id: user.id } });
        return {
          success: false,
          message: `Failed to create driver profile: ${driverResult.message}`,
        };
      }

      driverProfile = driverResult.data;

      // Create vehicle if vehicle data is provided and driver profile was created successfully
      if (data.vehicleData && driverProfile) {
        const vehicleResult = await vehicleService.createVehicle({
          plateNumber: data.vehicleData.plateNumber,
          bodyNumber: data.vehicleData.bodyNumber,
          vehiclePhoto: data.vehicleData.vehiclePhoto,
          orCrPhoto: data.vehicleData.orCrPhoto,
          driverId: driverProfile.id,
        });

        if (!vehicleResult.success) {
          // Rollback user and driver creation if vehicle creation fails
          await prisma.user.delete({ where: { id: user.id } });
          return {
            success: false,
            message: `Failed to create vehicle: ${vehicleResult.message}`,
          };
        }
      }
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "", { expiresIn: "7d" });

    return {
      user,
      studentProfile,
      driverProfile,
      token,
      success: true,
      message: data.studentProfile
        ? "User and student profile created successfully"
        : data.driverProfile
        ? "User and driver profile created successfully"
        : "User created successfully",
    };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, message: "Server error" };
  }
}

async function login(email: string, password: string, role: string) {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return { success: false, message: "Invalid credentials" };

    // Check if user role matches the required role
    if (!["admin", "driver", "passenger"].includes(user.role)) {
      return {
        success: false,
        message: "Access denied: Invalid role for this login",
      };
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "", { expiresIn: "7d" });

    return {
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          middleName: user.middleName,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
        token,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Server error",
    };
  }
}
