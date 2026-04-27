-- CreateTable
CREATE TABLE `game` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `format` ENUM('STROKE', 'STABLEFORD', 'CHICAGO_39') NOT NULL,
    `skinsType` ENUM('NONE', 'NET', 'HALF_SHOT') NOT NULL DEFAULT 'NONE',
    `status` ENUM('SETUP', 'IN_PROGRESS', 'COMPLETE') NOT NULL DEFAULT 'SETUP',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `game_courseId_idx`(`courseId`),
    INDEX `game_status_date_idx`(`status`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_entry` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `teeId` VARCHAR(191) NOT NULL,
    `courseHandicap` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `game_entry_gameId_idx`(`gameId`),
    INDEX `game_entry_playerId_idx`(`playerId`),
    INDEX `game_entry_teeId_idx`(`teeId`),
    UNIQUE INDEX `game_entry_gameId_playerId_key`(`gameId`, `playerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_gameId_idx`(`gameId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_member` (
    `groupId` VARCHAR(191) NOT NULL,
    `gameEntryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `group_member_gameEntryId_key`(`gameEntryId`),
    INDEX `group_member_groupId_idx`(`groupId`),
    PRIMARY KEY (`groupId`, `gameEntryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `score` (
    `id` VARCHAR(191) NOT NULL,
    `gameEntryId` VARCHAR(191) NOT NULL,
    `holeNumber` INTEGER NOT NULL,
    `strokes` INTEGER NULL,
    `enteredByUserId` VARCHAR(191) NULL,
    `enteredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `score_gameEntryId_idx`(`gameEntryId`),
    UNIQUE INDEX `score_gameEntryId_holeNumber_key`(`gameEntryId`, `holeNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `game` ADD CONSTRAINT `game_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_entry` ADD CONSTRAINT `game_entry_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `game`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_entry` ADD CONSTRAINT `game_entry_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `player`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_entry` ADD CONSTRAINT `game_entry_teeId_fkey` FOREIGN KEY (`teeId`) REFERENCES `tee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group` ADD CONSTRAINT `group_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `game`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_member` ADD CONSTRAINT `group_member_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_member` ADD CONSTRAINT `group_member_gameEntryId_fkey` FOREIGN KEY (`gameEntryId`) REFERENCES `game_entry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `score` ADD CONSTRAINT `score_gameEntryId_fkey` FOREIGN KEY (`gameEntryId`) REFERENCES `game_entry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
