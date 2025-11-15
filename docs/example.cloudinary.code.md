    EXAMPLE CODE TO USE FOR REFENCE ONLY ON HOW TO USE CLOUDINARY

    const uploadAvatar = async (req: AuthRequest, res: Response, _next: NextFunction) => {
    	const file = req.file as Express.Multer.File;
    	const userId = req.userId;

    	if (!userId) {
    		userLogger.error(config.ERROR.USER.MISSING_ID);
    		res.status(400).json({ error: config.ERROR.USER.USER_ID_REQUIRED });
    		return;
    	}

    	if (!file) {
    		userLogger.error("No file provided for avatar upload");
    		res.status(400).json({ error: "No file provided for avatar upload" });
    		return;
    	}

    	userLogger.info(`Uploading avatar for user: ${userId}`);

    	try {
    		// Verify user exists
    		const user = await prisma.user.findFirst({
    			where: { id: userId, isDeleted: false },
    		});

    		if (!user) {
    			userLogger.error(`${config.ERROR.USER.NOT_FOUND}: ${userId}`);
    			res.status(404).json({ error: config.ERROR.USER.NOT_FOUND });
    			return;
    		}

    		// Upload file to cloudinary
    		const uploadResult = await cloudinaryService.uploadAttachment(
    			file,
    			`avatars/${userId}`,
    		);

    		// Update the user with the new avatar URL
    		const updatedUser = await prisma.user.update({
    			where: { id: userId },
    			data: { avatar: uploadResult.url },
    			include: { person: true },
    		});

    		userLogger.info(`Successfully uploaded avatar for user: ${userId}`);
    		res.status(200).json({
    			avatar: {
    				name: uploadResult.filename,
    				url: uploadResult.url,
    			},
    			updatedUser: {
    				id: updatedUser.id,
    				avatar: updatedUser.avatar,
    			},
    		});
    	} catch (error) {
    		userLogger.error(`Error uploading avatar for user ${userId}: ${error}`);
    		res.status(500).json({ error: "Failed to upload avatar" });
    	}
    };

    const deleteAvatar = async (req: AuthRequest, res: Response, _next: NextFunction) => {
    	const userId = req.userId;

    	if (!userId) {
    		userLogger.error(config.ERROR.USER.MISSING_ID);
    		res.status(400).json({ error: config.ERROR.USER.USER_ID_REQUIRED });
    		return;
    	}

    	try {
    		const user = await prisma.user.findFirst({
    			where: { id: userId, isDeleted: false },
    		});

    		if (!user) {
    			userLogger.error(`${config.ERROR.USER.NOT_FOUND}: ${userId}`);
    			res.status(404).json({ error: config.ERROR.USER.NOT_FOUND });
    			return;
    		}

    		if (!user.avatar) {
    			userLogger.error(`No avatar found for user ${userId}`);
    			res.status(404).json({ error: "No avatar found for this user" });
    			return;
    		}

    		// Extract the filename from the URL if needed
    		const urlParts = user.avatar.split("/");
    		const filename = urlParts[urlParts.length - 1];

    		// Remove the avatar from the user
    		await prisma.user.update({
    			where: { id: userId },
    			data: { avatar: null },
    		});

    		// Attempt to delete from Cloudinary
    		try {
    			await cloudinaryService.deleteAttachment(filename, `avatars/${userId}`);
    		} catch (error) {
    			userLogger.error(
    				`Error deleting avatar from Cloudinary for user ${userId}: ${error}`,
    			);
    		}

    		userLogger.info(`Deleted avatar for user: ${userId}`);
    		res.status(200).json({
    			message: "Avatar deleted successfully",
    		});
    	} catch (error) {
    		userLogger.error(`Error deleting avatar for user ${userId}: ${error}`);
    		res.status(500).json({ error: "Failed to delete avatar" });
    	}
    };
