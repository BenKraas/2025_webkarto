# -*- coding: utf-8 -*-
# imports
import requests
import pandas as pd
import geopandas as gpd
import uuid
import time
import logging
from datetime import datetime
from pathlib import Path


# File paths (relative to the script's location)
def init(__file__):
    global root, csv_file_target, bahnhoefe_geodata_source, bahnhoefe_geojson_target, full_request_text_target, path_logging
    root = Path(__file__).parent.parent
    csv_file_target = root / "data" / "api" / "final_departures.csv"
    bahnhoefe_geodata_source = root / "data" / "geodata" / "source" / "bahnhoefe.shp"
    bahnhoefe_geojson_target = (
        root / "data" / "geodata" / "generated" / "bahnhoefe_running.geojson"
    )
    full_request_text_target = root / "data" / "temp" / "vrr_api_full_responses.txt"
    path_logging = root / "data" / "logs" / "api_requests.log"

    # List of all paths to ensure they exist
    all_paths = [
        csv_file_target,
        bahnhoefe_geodata_source,
        bahnhoefe_geojson_target,
        full_request_text_target,
        path_logging,
    ]
    for path in all_paths:
        if not path.parent.exists():
            path.parent.mkdir(parents=True, exist_ok=True)

    # Initialize logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(path_logging),
            logging.StreamHandler(),
        ],
    )


class APIHandler():
    """
    Class to handle API responses and log the status.
    This class can be extended to include more functionality if needed.
    """

    def __init__(self, name, datetime_dt):
        """
        Initializes the APIHandler with parameters and datetime.
        Args:
            params (dict): Parameters for the API request.
            datetime_dt (datetime): The datetime for which the request is made.
        """
        self.params = self._paramsdict(datetime_dt)
        self.params["name"] = name
        self.datetime_dt = datetime_dt


    def request_by_name(self, datetime_dt, name):
        """
        Fetches public transport departure information from the VRR API for a given stop and datetime.
        """

        params = self._paramsdict(datetime_dt)
        params["name"] = name

        self.params.update(params)
        self.datetime_dt = datetime_dt
        
        logging.info(f"  | Requesting departures for {name} at {datetime_dt.isoformat()}")
        self.api_request()
    
    def request_by_params(self, datetime_dt, place_dm, name_dm):
        """
        Fetches public transport departure information from the VRR API for a given stop and datetime.
        Args:
            datetime_dt (datetime): The datetime for which the request is made.
            place_dm (str): The place identifier for the API request.
            name_dm (str): The name of the stop for the API request.
        """
        params = self._paramsdict(datetime_dt)
        params["place_dm"] = place_dm
        params["name_dm"] = name_dm

        self.params.update(params)
        self.datetime_dt = datetime_dt
        
        logging.info(f"  | Requesting departures for {name_dm} at {datetime_dt.isoformat()}")
        self.api_request()

    def api_request(self):
        """
        Makes an API request to the VRR API with the given parameters.
        Args:
            datetime_dt (datetime): The datetime for which the request is made.
            params (dict): Parameters for the API request.
        Returns:
            dict: The JSON response from the API.
        """
        url = "https://efa.vrr.de/standard/XML_DM_REQUEST"

        try:
            response = requests.get(url, params=self.params)
            self._communicate_response(response)
            self.response = response
            data = response.json()
            self.departures = data.get("departureList", [])
            self.coords = self._extract_coords(data)
            self.df_departures = pd.DataFrame(self._build_results(
            ))

        except requests.RequestException as e:
            self._communicate_response(e.response)
            logging.error(f"  | API request failed: {e}")
            self.response, self.departures, self.df_departures = None, None, None
            
        # Write the raw response to a text file for debugging purposes
        print("")

    def _extract_coords(self, data):
        """
        Extracts coordinates from the API response data.
        Args:
            data (dict): The JSON response from the API.
        Returns:
            tuple: A tuple containing latitude and longitude.
        """
        try:
            coords = data.get("dm", {}).get("points", {}).get("point", {}).get("ref", {}).get("coords", "0,0").split(",")
            latitude = float(coords[1]) if len(coords) > 1 else None
            longitude = float(coords[0]) if len(coords) > 0 else None
            # divide by 100000 to convert to degrees
            latitude /= 100000
            longitude /= 100000
            return latitude, longitude
        except (ValueError, TypeError):
            return None, None

    def _build_results(self):
        """Builds a list of dictionaries containing the departure information."""
        results = []
        departures = self.departures
        datetime_dt = self.datetime_dt

        for dep in departures:
            stop_name = dep.get("stopName")
            platform = dep.get("platformName", dep.get("platform"))
            scheduled = dep.get("dateTime", {})
            real = dep.get("realDateTime", {})

            # Build full datetime for scheduled and real departure
            try:
                scheduled_dt = datetime(
                    int(scheduled.get("year", datetime_dt.year)),
                    int(scheduled.get("month", datetime_dt.month)),
                    int(scheduled.get("day", datetime_dt.day)),
                    int(scheduled.get("hour", 0)),
                    int(scheduled.get("minute", 0)),
                )
            except Exception:
                scheduled_dt = None
            try:
                real_dt = (
                    datetime(
                        int(real.get("year", datetime_dt.year)),
                        int(real.get("month", datetime_dt.month)),
                        int(real.get("day", datetime_dt.day)),
                        int(real.get("hour", 0)),
                        int(real.get("minute", 0)),
                    )
                    if real
                    else None
                )
            except Exception:
                real_dt = None

            line = dep.get("servingLine", {}).get("number")
            direction = dep.get("servingLine", {}).get("direction")
            delay = dep.get("servingLine", {}).get("delay")
            cancelled = dep.get("servingLine", {}).get("cancelled")
            connection_exists = not (str(cancelled) == "1")
            # Additional fields
            delay_reason = dep.get("servingLine", {}).get("delayReason")
            realtime_status = dep.get("servingLine", {}).get("realtimeStatus")
            status_text = dep.get("servingLine", {}).get("statusText")


            results.append(
                {
                    "stop": stop_name,
                    "platform": platform,
                    "line": line,
                    "direction": direction,
                    "scheduled_departure": scheduled_dt,
                    "real_departure": real_dt,
                    "scheduled_time": scheduled_dt.time() if scheduled_dt else None,
                    "scheduled_date_iso": scheduled_dt.date().isoformat()
                    if scheduled_dt
                    else None,
                    "delay_min": int(delay)
                    if delay not in (None, "", "-9999")
                    else None,
                    "connection_exists": connection_exists,
                    "delay_reason": delay_reason,
                    "realtime_status": realtime_status,
                    "status_text": status_text,
                    # Extract coordinates from the nested JSON structure
                    "latitude": self.coords[0] if self.coords else None,
                    "longitude": self.coords[1] if self.coords else None,
                }
            )

        return results
        
    def _paramsdict(self, datetime_dt):
        """
        Returns the parameters for the API request.
        """
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
        }
        return params
    
    def _communicate_response(self, response):
        """Handles the response from the API and logs the status."""
        response_lut = {
            200: ("INFO", "Request successful"),
            204: ("WARNING", "No departures found"),
            400: ("ERROR", "Bad request"),
            404: ("ERROR", "Not found"),
            500: ("ERROR", "Internal server error"),
            503: ("ERROR", "Service unavailable"),
            429: ("WARNING", "Too many requests"),
        }
        status_code = response.status_code
        if status_code in response_lut:
            log_level, message = response_lut[status_code]
            logging.log(getattr(logging, log_level), f"  | {message} for {self.params.get('name', 'unknown')} at {self.datetime_dt.isoformat()}")
        else:
            logging.error(f"  | Unexpected status code {status_code} for {self.params.get('name', 'unknown')} at {self.datetime_dt.isoformat()}")


class GeoDataHandler():
    """
    Class to handle geospatial data operations.
    This class can be extended to include more functionality if needed.
    """
    
    def __init__(self, bahnhoefe_geojson_target, names):
        """
        Initializes the GeoDataHandler with a list of names.
        Args:
            names (list): List of names for which geospatial data is to be handled.
        """
        self.names = names

        # attempt loading the existing GeoDataFrame from the GeoJSON file
        if bahnhoefe_geojson_target.exists():
            self.gdf = gpd.read_file(bahnhoefe_geojson_target)
        else:
            self.gdf = gpd.GeoDataFrame(
                columns=[
                    "stop",
                    "lines",
                    "directions",
                    "scheduled_departures",
                    "real_departures",
                    "delays",
                    "connection_exists",
                    "latitude",
                    "longitude",
                    "datetime",
                ],
                geometry=gpd.points_from_xy([], []),
                crs="EPSG:4326",  # WGS 84
            )

    
    def add_from_response(self, handler: APIHandler):
        """
        Adds geospatial data from the API response to the GeoDataFrame.
        Each response updates or adds a single row per stop, squashing values into lists.
        Args:
            handler (APIHandler): The APIHandler instance containing the response.
        """
        if handler.df_departures is None or handler.df_departures.empty:
            raise ValueError("No response to process.")

        stop_name = handler.df_departures["stop"].iloc[0] if "stop" in handler.df_departures.columns else "Unknown Stop"

        # Convert timestamps to ISO format strings with double quotes
        def to_iso(val):
            if pd.isnull(val):
                return None
            if isinstance(val, datetime):
                return f'"{val.isoformat()}"'
            return f'"{str(val)}"'

        scheduled_departures = [to_iso(dt) for dt in handler.df_departures["scheduled_departure"]]
        real_departures = [to_iso(dt) for dt in handler.df_departures["real_departure"]]
        scheduled_dates_iso = [to_iso(dt) for dt in handler.df_departures["scheduled_date_iso"]]

        new_row = {
            "stop": stop_name,
            "lines": list(handler.df_departures["line"]),
            "directions": list(handler.df_departures["direction"]),
            "scheduled_departures": scheduled_departures,
            "real_departures": real_departures,
            "delays": list(handler.df_departures["delay_min"]),
            "connection_exists": list(handler.df_departures["connection_exists"]),
            "latitude": list(handler.df_departures["latitude"]),
            "longitude": list(handler.df_departures["longitude"]),
            "datetime": f'"{handler.datetime_dt.isoformat()}"',
        }

        # Geometry: use first lat/lon for the stop
        if new_row["latitude"] and new_row["longitude"]:
            geometry = gpd.points_from_xy([new_row["longitude"][0]], [new_row["latitude"][0]])[0]
        else:
            geometry = None
        new_row["geometry"] = geometry

        # Check if stop already exists in gdf
        existing_idx = self.gdf[self.gdf["stop"] == stop_name].index
        if len(existing_idx) > 0:
            # Update the existing row
            for col, val in new_row.items():
                if col not in self.gdf.columns:
                    self.gdf[col] = None
                # Ensure geometry is a valid shapely object
                if col == "geometry" and val is not None:
                    from shapely.geometry import Point
                    if not isinstance(val, Point):
                        val = Point(new_row["longitude"][0], new_row["latitude"][0])
                # Always assign lists directly, never as strings
                if isinstance(val, list):
                    self.gdf.at[existing_idx[0], col] = val
                else:
                    self.gdf.at[existing_idx[0], col] = val
        else:
            # Add new row
            self.gdf = pd.concat([self.gdf, gpd.GeoDataFrame([new_row], crs="EPSG:4326")], ignore_index=True)

        # Ensure geometry column is set
        self.gdf.set_geometry("geometry", inplace=True)
        self.gdf.crs = "EPSG:4326"

    
    def save_to_geojson(self):
        """
        Saves the GeoDataFrame to a GeoJSON file.
        """
        try:
            self.gdf.to_file(bahnhoefe_geojson_target, driver="GeoJSON")
            logging.info(f"  | GeoDataFrame saved to {bahnhoefe_geojson_target}")
        except Exception as e:
            logging.error(f"  | Error saving GeoDataFrame: {e}")


# Main function to handle the API requests and manage the CSV file
def main(names, delay_min=10, n_entries=30):
    
    total_requests = len(names)
    delay_s = delay_min * 60  # convert minutes to seconds
    request_delay = delay_s / (
        total_requests + 1
    )  # time the actual requests so that they space out over the delay time

    logging.info(
        f"Starting process\nTotal requests: {total_requests}\nDelay per request: {round(request_delay/60, 2)} minutes.\nStarting the main loop..."
    )

    geodatahandler = GeoDataHandler(bahnhoefe_geojson_target, names)
    first_run = True

    while True:
        logging.info("Starting a new cycle of requests...")

        for name in names:
            try:
                datetime_dt = datetime.now()
                apihandler = APIHandler(
                    name=name,
                    datetime_dt=datetime_dt,
                )
                place_dm, name_dm = name

                logging.info(f"| Requesting departures for {name} at {datetime_dt.isoformat()}")
                apihandler.request_by_params(datetime_dt, place_dm, name_dm)
                geodatahandler.add_from_response(apihandler)
                geodatahandler.save_to_geojson()

                logging.info(f"| Sleeping for {round(request_delay/60, 2)} minutes.")
                time.sleep(request_delay)

            except requests.exceptions.RequestException as e:
                logging.error(
                    f"| Request failed for {name} at {datetime_dt.isoformat()}: {e}"
                )
                time.sleep(request_delay)
                continue

            except Exception as e:
                logging.error(
                    f"| An unexpected error occurred for {name} at {datetime_dt.isoformat()}: {e}"
                )
                time.sleep(request_delay)
                continue

        time.sleep(request_delay)


if __name__ == "__main__":
    # Initialize
    init(__file__)

    names = [
        ("Duisburg", "HBF"),
        ("Bochum", "HBF"),
        ("Dortmund", "HBF"),
        ("Essen", "HBF"),
        ("Gelsenkirchen", "HBF"),
    ]

    # Start the main function with the specified parameters
    main(names, delay_min=1, n_entries=30)

    
