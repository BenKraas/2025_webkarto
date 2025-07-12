# -*- coding: utf-8 -*-
# imports
import requests
import pandas as pd
import uuid
import time
import os
import logging
from datetime import datetime
from pathlib import Path

# Initialize logging to log to both file and console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_requests.log'),
        logging.StreamHandler()
    ]
)


def full_api_request(datetime_dt, place_dm, name_dm):

    # Function logs the API response status and handles different HTTP status codes
    def communicate_response(response, place_dm, name_dm, datetime_dt):
        """Handles the response from the API and logs the status."""
        if response.status_code == 200:
            logging.info(f"(200) Request successful for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        elif response.status_code == 204:
            logging.info(f"(204) No departures found for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        elif response.status_code == 400:
            logging.warning(f"(400) Bad request for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        elif response.status_code == 404:
            logging.error(f"(404) Not found for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        elif response.status_code == 500:
            logging.error(f"(500) Internal server error for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        elif response.status_code == 503:
            logging.error(f"(503) Service unavailable for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        elif response.status_code == 429:
            logging.error(f"(429) Too many requests for {place_dm} {name_dm} at {datetime_dt.isoformat()}")
        else:
            logging.error(f"Error: {response.status_code} - {response.text}")
        return response

    # Function to create a unique identifier (UUID) for each departure
    def make_uid(stop, scheduled_datetime, line):
        base = f"{stop}|{scheduled_datetime}|{line}"
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, base))
    
    # Function to build the results from the API response
    def build_results(datetime_dt, make_uid, departures):
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
    textfile = Path("vrr_api_full_responses.txt")
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

# Main function to handle the API requests and manage the CSV file
def main(delay_min, placename_list):
    total_requests = len(placename_list)
    delay_s = delay_min * 60  # convert minutes to seconds
    request_delay = delay_s / total_requests # time the actual requests so that they space out over the delay time

    # initialize csv
    csv_file = Path('final_departures.csv')

    # Main loop
    logging.info(f"Total requests: {total_requests}, Delay per request: {round(request_delay/60, 2)} minutes.")
    logging.info("Starting the request loop...")

    # Load existing UUIDs only once at the start
    try:
        existing_df = pd.read_csv('final_departures.csv', usecols=['uuid'])
        existing_uuids = set(existing_df['uuid'].dropna().astype(str))
        logging.info(f"Loaded {len(existing_uuids)} existing UUIDs.")
    except FileNotFoundError:
        existing_uuids = set()
        logging.info("No existing UUIDs found, starting fresh.")

    while True:
        logging.info("Starting a new cycle of requests...")

        for place_dm, name_dm in placename_list:
            try:
                datetime_dt = datetime.now()

                df, status_code = full_api_request(datetime_dt, place_dm, name_dm)

                if not df.empty:
                    df['uuid'] = df['uuid'].astype(str)
                    new_df = df[~df['uuid'].isin(existing_uuids)]

                    if not new_df.empty:
                        new_df.to_csv('final_departures.csv', mode='a', header=not existing_uuids, index=False)
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

        logging.info("Next cycle...")


if __name__ == "__main__":
    # Set the delay in minutes and the list of places to query
    delay_min = 10
    placename_list = [("Duisburg", "HBF"), ("Mönchengladbach", "HBF"), ("Wuppertal", "HBF"), ("Bochum", "HBF"), ("Dortmund", "HBF"), ("Essen", "HBF"), ("Düsseldorf", "HBF")]

    main(delay_min, placename_list)