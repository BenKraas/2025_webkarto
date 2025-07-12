# -*- coding: utf-8 -*-
# imports
import requests
import pandas as pd
import geopandas as gpd
import uuid
import time
import os
import logging
from datetime import datetime
from pathlib import Path

# File paths
root = Path(__file__).parent.parent
csv_file_target = root / 'data' / 'api' / 'final_departures.csv'
bahnhoefe_geodata_source = root / 'data' / 'geodata' / 'source' / 'bahnhoefe.shp'
bahnhoefe_geojson_target = root / 'data' / 'geodata' / 'generated' / 'bahnhoefe_running.geojson'
full_request_text_target = root / 'data' / 'temp' / 'vrr_api_full_responses.txt'

# make sure all paths exist
if not csv_file_target.parent.exists():
    csv_file_target.parent.mkdir(parents=True, exist_ok=True)
if not bahnhoefe_geodata_source.parent.exists():
    bahnhoefe_geodata_source.parent.mkdir(parents=True, exist_ok=True)
if not bahnhoefe_geojson_target.parent.exists():
    bahnhoefe_geojson_target.parent.mkdir(parents=True, exist_ok=True)
if not full_request_text_target.parent.exists():
    full_request_text_target.parent.mkdir(parents=True, exist_ok=True)


# Initialize logging to log to both file and console
def init(root):
    if not os.path.exists(root / 'data' / 'logs'):
        os.makedirs(root / 'data' / 'logs', exist_ok=True)
    logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(root / 'data' / 'logs' / 'api_requests.log'),
        logging.StreamHandler()
    ]
)

def full_api_request(datetime_dt, place_dm, name_dm):

    def communicate_response(response, place_dm, name_dm, datetime_dt):
        """Handles the response from the API and logs the status."""
        response_lut = { 200: "Request successful", 204: "No departures found", 400: "Bad request", 404: "Not found", 500: "Internal server error", 503: "Service unavailable", 429: "Too many requests"}
        logging.info(f"({response.status_code}) {response_lut.get(response.status_code, 'Unknown status')} for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        return response

    def make_uid(stop, scheduled_datetime, line):
        """Generates a unique identifier for each departure based on stop, scheduled datetime, and line."""
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{stop}|{scheduled_datetime}|{line}"))
    
    def build_results(datetime_dt, make_uid, departures):
        """Builds a list of dictionaries containing the departure information."""
        results = []
        for dep in departures:
            stop_name = dep.get('stopName')
            platform = dep.get('platformName', dep.get('platform'))
            scheduled = dep.get('dateTime', {})
            real = dep.get('realDateTime', {})
            
            # Build full datetime for scheduled and real departure
            try:
                scheduled_dt = datetime(
                    int(scheduled.get('year', datetime_dt.year)),
                    int(scheduled.get('month', datetime_dt.month)),
                    int(scheduled.get('day', datetime_dt.day)),
                    int(scheduled.get('hour', 0)),
                    int(scheduled.get('minute', 0))
                )
            except Exception:
                scheduled_dt = None
            try:
                real_dt = datetime(
                    int(real.get('year', datetime_dt.year)),
                    int(real.get('month', datetime_dt.month)),
                    int(real.get('day', datetime_dt.day)),
                    int(real.get('hour', 0)),
                    int(real.get('minute', 0))
                ) if real else None
            except Exception:
                real_dt = None

            line = dep.get('servingLine', {}).get('number')
            direction = dep.get('servingLine', {}).get('direction')
            delay = dep.get('servingLine', {}).get('delay')
            cancelled = dep.get('servingLine', {}).get('cancelled')
            connection_exists = not (str(cancelled) == "1")
            # Additional fields
            delay_reason = dep.get('servingLine', {}).get('delayReason')
            realtime_status = dep.get('servingLine', {}).get('realtimeStatus')
            status_text = dep.get('servingLine', {}).get('statusText')

            uid = make_uid(stop_name, scheduled_dt, line)

            results.append({
                'uuid': uid,
                'stop': stop_name,
                'platform': platform,
                'line': line,
                'direction': direction,
                'scheduled_departure': scheduled_dt,
                'real_departure': real_dt,
                'scheduled_time': scheduled_dt.time() if scheduled_dt else None,
                'scheduled_date_iso': scheduled_dt.date().isoformat() if scheduled_dt else None,
                'delay_min': int(delay) if delay not in (None, '', '-9999') else None,
                'connection_exists': connection_exists,
                'delay_reason': delay_reason,
                'realtime_status': realtime_status,
                'status_text': status_text
            })
            
        return results
    

    # Prepare the parameters for the API request
    params = {
        "language": "de",
        "mode": "direct",
        "outputFormat": "JSON",
        "type_dm": "stop",
        "useProxFootSearch": 0,
        "useRealtime": 1,
        "itdDateDay": datetime_dt.day,
        "itdDateMonth": datetime_dt.month,
        "itdDateYear": datetime_dt.year,
        "itdTimeHour": datetime_dt.hour,
        "itdTimeMinute": datetime_dt.minute,
        "place_dm": place_dm,
        "name_dm": name_dm,
    }

    # Create a text file to store the raw API responses (Debugging purposes)
    textfile = full_request_text_target
    if not textfile.exists():
        textfile.touch()

    # API URL for the VRR (Verkehrsverbund Rhein-Ruhr) departures
    # This URL is used to fetch the departure information based on the parameters provided
    # The API is expected to return a JSON response with the departure details
    API_URL = "https://efa.vrr.de/standard/XML_DM_REQUEST"

    # Make the API request
    logging.info(f"Making API request for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
    response = requests.get(API_URL, params=params)
    
    # Handle the response
    response = communicate_response(response, place_dm, name_dm, datetime_dt)

    # Check if the response is successful and contains data
    if response.status_code in [200, 204]:
        # Write the raw response to a text file for debugging purposes
        try:
            with open(textfile, "a", encoding="utf-8") as f:
                f.write(response.text + "\n\n")
            logging.info(f"Response written to {textfile}")
        except Exception as e:
            logging.error(f"Error writing to {textfile}: {e}")
        data = response.json()
    else:
        # If the response is not successful, return an empty DataFrame and the status code
        logging.error(f"Failed to fetch data for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        raise requests.exceptions.RequestException(
            f"Request failed with status code {response.status_code} for {place_dm} {name_dm} at {datetime_dt.isoformat()}"
        )

    # Extract the departure list from the response data
    departures = data.get('departureList', [])

    # Build the results from the departures
    df_departures = pd.DataFrame(build_results(datetime_dt, make_uid, departures))

    # LUT (Lookup Table) for replacing special characters in the stop, direction, and line names
    # This is necessary to ensure that the data is clean and consistent, in this case for German characters
    lut = {"Ã¼": "ü", "Ã¶": "ö", "Ã¤": "ä", "ÃŸ": "ß", "Ã": "ß"}
    for col in ['stop', 'direction', 'line']:
        df_departures[col] = df_departures[col].replace(lut, regex=True)

    # Convert the scheduled and real departure times to ISO format
    df_departures['scheduled_departure'] = pd.to_datetime(df_departures['scheduled_departure'], errors='coerce').dt.strftime('%Y-%m-%dT%H:%M:%S')
    df_departures['real_departure'] = pd.to_datetime(df_departures['real_departure'], errors='coerce').dt.strftime('%Y-%m-%dT%H:%M:%S')
    
    # return df_departures, response.status_code
    return df_departures, response.status_code

def update_geodata(csv_file_path, geodata_file_path, geodata_target, n_data: int):
    """
    For each stop in the DataFrame, get the last 10 departures and add them as lists into the GeoDataFrame.
    The GeoDataFrame uses short column names due to shapefile limitations, so columns are mapped accordingly.
    """
    # Define the number of rows to load from the CSV file
    row_load = n_data * 40

    # Load the CSV file into a DataFrame, get the last 200 rows
    df = pd.read_csv(csv_file_path, usecols=[
        'uuid', 'stop', 'platform', 'line', 'direction',
        'scheduled_departure', 'real_departure', 'delay_min', 'connection_exists'
    ]).tail(row_load)

    # Load the geodata shapefile
    gdf = gpd.read_file(geodata_file_path)

    # Create a new DataFrame which will get the last 10 departures for each stop and put them into lists for each column so that only one row per stop is created
    new_data = []
    for stop in gdf['stop'].unique():
        stop_data = df[df['stop'] == stop].sort_values(by='scheduled_departure').tail(n_data)
        if not stop_data.empty:
            # Create a dictionary for the stop with lists of the last 10 departures
            new_data.append({
                'stop': stop,
                'departures': stop_data['uuid'].fillna('').tolist(),
                'platforms': stop_data['platform'].fillna('').tolist(),
                'lines': stop_data['line'].fillna('').tolist(),
                'directions': stop_data['direction'].fillna('').tolist(),
                'scheduled_departures': stop_data['scheduled_departure'].fillna('').tolist(),
                'real_departures': stop_data['real_departure'].fillna('').tolist(),
                'delays': stop_data['delay_min'].fillna(0).tolist(),
                'connection_exists': stop_data['connection_exists'].fillna('').tolist()
            })

    # Create a new GeoDataFrame from the new data
    new_gdf = gpd.GeoDataFrame(new_data, geometry=gdf.geometry[gdf['stop'].isin([d['stop'] for d in new_data])].values, crs=gdf.crs)

    # Save the new GeoDataFrame to the target geojson file
    if not geodata_target.parent.exists():
        geodata_target.parent.mkdir(parents=True)
    new_gdf.to_file(geodata_target, driver='GeoJSON')


# Main function to handle the API requests and manage the CSV file
def main(delay_min, placename_list, n_entries):
    total_requests = len(placename_list)
    delay_s = delay_min * 60  # convert minutes to seconds
    request_delay = delay_s / (total_requests + 1)  # time the actual requests so that they space out over the delay time

    logging.info(f"Total requests: {total_requests}, Delay per request: {round(request_delay/60, 2)} minutes.")
    logging.info("Starting the request loop...")

    # Load existing UUIDs only once at the start
    try:
        existing_df = pd.read_csv(csv_file_target, usecols=['uuid'])
        existing_uuids = set(existing_df['uuid'].dropna().astype(str))
        logging.info(f"Loaded {len(existing_uuids)} existing UUIDs.")
    except FileNotFoundError:
        existing_uuids = set()
        logging.info("No existing UUIDs found, starting fresh.")

    # Main loop
    while True:
        logging.info("Starting a new cycle of requests...")

        # Update the geodata with the new departures
        try:
            update_geodata(csv_file_target, bahnhoefe_geodata_source, bahnhoefe_geojson_target, n_entries)
            logging.info(f"Geodata updated and saved to {bahnhoefe_geojson_target}.")
        except Exception as e:
            logging.warning(f"Error updating geodata: {e}. This may be harmless if you just started the script for the first time.")

        for place_dm, name_dm in placename_list:
            
            try:
                datetime_dt = datetime.now()

                df, status_code = full_api_request(datetime_dt, place_dm, name_dm)

                if not df.empty:
                    df['uuid'] = df['uuid'].astype(str)
                    new_df = df[~df['uuid'].isin(existing_uuids)]

                    if not new_df.empty:
                        new_df.to_csv(csv_file_target, mode='a', header=not existing_uuids, index=False)
                        existing_uuids.update(new_df['uuid'])

                        logging.info(f"Appended {len(new_df)} new departures. Status code: {status_code}")
                    else:
                        logging.info("No new UUIDs to append.")
                else:
                    logging.info(f"No departures found for {place_dm} - {name_dm}. Status code: {status_code}")

                logging.info(f"Sleeping for {round(request_delay/60, 2)} minutes.")
                time.sleep(request_delay)

            except requests.exceptions.RequestException as e:
                logging.error(f"Request failed for {place_dm} - {name_dm} ({status_code}): {e}")
                time.sleep(request_delay)
                continue

            except Exception as e:
                logging.error(f"An error occurred while processing {place_dm} - {name_dm}: {e}")
                time.sleep(request_delay)
                continue
        
        time.sleep(request_delay)
        logging.info("Next cycle...")



if __name__ == "__main__":
    # Configuration for the main function
    init(root)

    # Set the delay in minutes and the number of entries to process
    delay_min = 10
    n_entries = 30
    placename_list = [("Duisburg", "HBF"), ("Mönchengladbach", "HBF"), ("Wuppertal", "HBF"), ("Bochum", "HBF"), ("Dortmund", "HBF"), ("Essen", "HBF"), ("Düsseldorf", "HBF")]

    # Start the main function with the specified parameters
    main(delay_min, placename_list, n_entries)