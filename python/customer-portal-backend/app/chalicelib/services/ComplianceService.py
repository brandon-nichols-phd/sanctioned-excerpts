from chalicelib.services.MapperService import MapperService
from chalicelib.services.compliance import ComplianceCalculator
from backendlib.cursormanager import get_cursor

def get_data_for_single_location(email, date_range_start, date_range_end, location_id):
    with get_cursor() as cursor:
        comp = ComplianceCalculator.ComplianceCalculator(cursor, email, {0: [location_id]}, date_range_start, date_range_end)
        return comp.generate_single_location_charts()

def get_data_for_multiple_locations(email, date_range_start, date_range_end, location_ids):
    with get_cursor() as cursor:
        comp = ComplianceCalculator.ComplianceCalculator(cursor, email, {0: location_ids}, date_range_start, date_range_end)
        return comp.generate_multi_location_charts()

def get_data_for_multiple_location_groups(email, date_range_start, date_range_end, location_group_ids):
    location_mapping = MapperService.get_lg_loc_mapping(location_group_ids)
    with get_cursor() as cursor:
        comp = ComplianceCalculator.ComplianceCalculator(cursor, email, location_mapping, date_range_start, date_range_end)
        return comp.generate_multi_group_charts()














