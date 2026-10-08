import { Request, Response } from "express";
import { HierarchicalReportService, ReportScopeMode } from "./hierarchical-report.service.js";

export async function getReportingScopeHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required."
            });
        }

        const scopeData = await HierarchicalReportService.getReportingScope(userId);
        return res.status(200).json({
            success: true,
            data: scopeData
        });
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to fetch reporting scope."
        });
    }
}

export async function getEducationSummaryReportHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required."
            });
        }

        const targetOrganizationId = req.query.targetOrganizationId as string | undefined;
        const scopeMode = (req.query.scopeMode as ReportScopeMode) || "CURRENT_AND_DESCENDANTS";
        const academicYearId = req.query.academicYearId as string | undefined;

        const report = await HierarchicalReportService.generateEducationSummary({
            userId,
            targetOrganizationId,
            scopeMode,
            academicYearId
        });

        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error: any) {
        const statusCode = error.statusCode || (error.message?.includes("Unauthorized") ? 403 : 500);
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to generate Education Summary report."
        });
    }
}

export async function exportEducationSummaryHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required."
            });
        }

        const targetOrganizationId = req.query.targetOrganizationId as string | undefined;
        const scopeMode = (req.query.scopeMode as ReportScopeMode) || "CURRENT_AND_DESCENDANTS";
        const academicYearId = req.query.academicYearId as string | undefined;
        const format = ((req.query.format as string) || "csv").toLowerCase();

        // 1. Generate report data with strict scope authorization
        const report = await HierarchicalReportService.generateEducationSummary({
            userId,
            targetOrganizationId,
            scopeMode,
            academicYearId
        });

        const safeOrgName = report.targetOrganization.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const timestamp = new Date().toISOString().split("T")[0];

        if (format === "excel" || format === "xlsx") {
            const excelBuffer = await HierarchicalReportService.generateExcelExport(report);
            const filename = `Education_Summary_${safeOrgName}_${timestamp}.xlsx`;

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            return res.status(200).send(excelBuffer);
        }

        // Default CSV
        const csvContent = HierarchicalReportService.generateCsvExport(report);
        const filename = `Education_Summary_${safeOrgName}_${timestamp}.csv`;

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (error: any) {
        const statusCode = error.statusCode || (error.message?.includes("Unauthorized") ? 403 : 500);
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to export Education Summary report."
        });
    }
}
