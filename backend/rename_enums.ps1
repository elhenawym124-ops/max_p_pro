$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

$replacements = @{
    'hr_leave_requests_status'      = 'LeaveStatus';
    'hr_employee_training_status'   = 'TrainingStatus';
    'hr_employees_gender'           = 'Gender';
    'SupportTicket_priority'        = 'SupportPriority';
    'hr_attendance_status'          = 'AttendanceStatus';
    'customers_customerRating'      = 'CustomerRating';
    'hr_performance_reviews_status' = 'ReviewStatus';
    'hr_employees_maritalStatus'    = 'MaritalStatus';
    'hr_payroll_status'             = 'PayrollStatus';
    'hr_employees_contractType'     = 'ContractType';
    'hr_employees_status'           = 'EmployeeStatus';
    'customers_status'              = 'CustomerStatus';
    'user_invitations_status'       = 'InvitationStatus';
    'users_role'                    = 'UserRole';
    'payments_status'               = 'PaymentStatus';
    'payments_method'               = 'PaymentMethod';
    'coupons_type'                  = 'CouponType';
    'tasks_status'                  = 'TaskStatus';
    'tasks_priority'                = 'TaskPriority';
    'orders_status'                 = 'OrderStatus';
    'orders_paymentStatus'          = 'PaymentStatus'; 
    'orders_paymentMethod'          = 'PaymentMethod'
}

# Note: PaymentStatus is mapped twice (payments_status and orders_paymentStatus). 
# This is fine if we want to unify them. 
# But duplicate keys in hashtable? No. keys are unique. Values can be same.
# 'orders_paymentStatus' = 'PaymentStatus'.
# 'payments_status' = 'PaymentStatus'.

foreach ($key in $replacements.Keys) {
    $val = $replacements[$key]
    # Replace global occurrences (whole word)
    # definition: enum key {
    # usage: field key
    $content = $content -replace "\b$key\b", $val
}

$content | Set-Content $path -Encoding UTF8
Write-Host "Enums renamed."
