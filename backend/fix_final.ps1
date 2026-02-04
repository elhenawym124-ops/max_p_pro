$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

# 1. Delete duplicate AIModelLimit (the one appearing later, around 4454)
# Pattern: model AIModelLimit { ... }
$pattern = "model\s+AIModelLimit\s+\{[\s\S]*?\n\}"
$content = $content -replace $pattern, ""

# 2. Fix Employee Relations
# I incorrectly put @relation("DepartmentManager") on benefitEnrollments 
# and removed it from managedDepartments.
# Need to swap/fix.

# Incorrect: managedDepartments Department[]
# Correct: managedDepartments Department[] @relation("DepartmentManager")
$content = $content.Replace("managedDepartments Department[]", "managedDepartments Department[] @relation(`"DepartmentManager`")")

# Incorrect: benefitEnrollments BenefitEnrollment[] @relation("DepartmentManager")
# Correct: benefitEnrollments BenefitEnrollment[]
$content = $content.Replace("benefitEnrollments BenefitEnrollment[] @relation(`"DepartmentManager`")", "benefitEnrollments BenefitEnrollment[]")

$content | Set-Content $path -Encoding UTF8
Write-Host "Fixed AIModelLimit and Employee relations."
